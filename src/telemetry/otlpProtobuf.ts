/**
 * Minimal, bounded OTLP protobuf reader.
 *
 * This intentionally decodes only the fields needed for token accounting:
 * span/log identities, timestamps, event names, and scalar attributes. Unknown
 * fields are skipped, raw bodies are never retained, and malformed wire data
 * fails closed before it can reach the host run.
 */

export interface DecodedOtlpRecord {
  readonly [key: string]: unknown;
}

class ProtoReader {
  private offset = 0;
  private readonly view: DataView;

  public constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  public get done(): boolean { return this.offset >= this.bytes.byteLength; }

  private ensure(length: number): void {
    if (!Number.isSafeInteger(length) || length < 0 || this.offset + length > this.bytes.byteLength) throw new Error('Truncated protobuf field');
  }

  public readVarint(): bigint {
    let value = 0n;
    for (let index = 0; index < 10; index += 1) {
      this.ensure(1);
      const byte = this.bytes[this.offset++]!;
      value |= BigInt(byte & 0x7f) << BigInt(index * 7);
      if ((byte & 0x80) === 0) return value;
    }
    throw new Error('Protobuf varint is too long');
  }

  public readTag(): { readonly field: number; readonly wire: number } {
    const tag = this.readVarint();
    const field = Number(tag >> 3n);
    const wire = Number(tag & 0x07n);
    if (!Number.isSafeInteger(field) || field < 1 || wire === 4 || wire > 5) throw new Error('Invalid protobuf tag');
    return { field, wire };
  }

  public readBytes(): Uint8Array {
    const length = this.readVarint();
    if (length > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Protobuf field is too large');
    const size = Number(length);
    this.ensure(size);
    const value = this.bytes.slice(this.offset, this.offset + size);
    this.offset += size;
    return value;
  }

  public readString(): string {
    return new TextDecoder().decode(this.readBytes());
  }

  public readFixed64(): bigint {
    this.ensure(8);
    const value = this.view.getBigUint64(this.offset, true);
    this.offset += 8;
    return value;
  }

  public readDouble(): number {
    this.ensure(8);
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  public skip(wire: number): void {
    if (wire === 0) { this.readVarint(); return; }
    if (wire === 1) { this.ensure(8); this.offset += 8; return; }
    if (wire === 2) { this.readBytes(); return; }
    if (wire === 5) { this.ensure(4); this.offset += 4; return; }
    throw new Error('Unsupported protobuf wire type');
  }
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function integer(value: bigint): string {
  return value.toString(10);
}

function parseAnyValue(bytes: Uint8Array): unknown {
  const reader = new ProtoReader(bytes);
  let result: unknown;
  while (!reader.done) {
    const { field, wire } = reader.readTag();
    if (field === 1 && wire === 2) result = reader.readString();
    else if (field === 2 && wire === 0) result = reader.readVarint() !== 0n;
    else if (field === 3 && wire === 0) result = integer(reader.readVarint());
    else if (field === 4 && wire === 1) result = reader.readDouble();
    else reader.skip(wire);
  }
  return result;
}

function parseKeyValue(bytes: Uint8Array): { readonly key: string; readonly value: unknown } | undefined {
  const reader = new ProtoReader(bytes);
  let key: string | undefined;
  let value: unknown;
  while (!reader.done) {
    const { field, wire } = reader.readTag();
    if (field === 1 && wire === 2) key = reader.readString();
    else if (field === 2 && wire === 2) value = parseAnyValue(reader.readBytes());
    else reader.skip(wire);
  }
  if (!key || key.length > 256) return undefined;
  return { key, value };
}

function parseSpan(bytes: Uint8Array): DecodedOtlpRecord {
  const reader = new ProtoReader(bytes);
  const attributes: Array<{ readonly key: string; readonly value: unknown }> = [];
  const result: Record<string, unknown> = { attributes };
  while (!reader.done) {
    const { field, wire } = reader.readTag();
    if (field === 1 && wire === 2) result.traceId = hex(reader.readBytes());
    else if (field === 2 && wire === 2) result.spanId = hex(reader.readBytes());
    else if (field === 6 && wire === 2) result.name = reader.readString();
    else if (field === 8 && wire === 1) result.startTimeUnixNano = integer(reader.readFixed64());
    else if (field === 9 && wire === 1) result.endTimeUnixNano = integer(reader.readFixed64());
    else if (field === 9 && wire === 0) result.endTimeUnixNano = integer(reader.readVarint());
    else if (field === 11 && wire === 2) {
      const entry = parseKeyValue(reader.readBytes());
      if (entry) attributes.push(entry);
    }
    else reader.skip(wire);
  }
  return result;
}

function parseLogRecord(bytes: Uint8Array): DecodedOtlpRecord {
  const reader = new ProtoReader(bytes);
  const attributes: Array<{ readonly key: string; readonly value: unknown }> = [];
  const result: Record<string, unknown> = { attributes };
  while (!reader.done) {
    const { field, wire } = reader.readTag();
    if (field === 1 && wire === 1) result.timeUnixNano = integer(reader.readFixed64());
    else if (field === 2 && wire === 1) result.observedTimeUnixNano = integer(reader.readFixed64());
    else if (field === 5 && wire === 2) result.body = parseAnyValue(reader.readBytes());
    else if (field === 6 && wire === 2) {
      const entry = parseKeyValue(reader.readBytes());
      if (entry) attributes.push(entry);
    }
    else if (field === 9 && wire === 2) result.traceId = hex(reader.readBytes());
    else if (field === 10 && wire === 2) result.spanId = hex(reader.readBytes());
    else if (field === 12 && wire === 2) {
      const eventName = reader.readString();
      // Older JSON producers place this value in attributes; expose the
      // protobuf field through the same normalized shape without retaining a
      // second copy of the raw record.
      attributes.push({ key: 'event.name', value: eventName });
    }
    else reader.skip(wire);
  }
  return result;
}

function parseRepeatedMessages(bytes: Uint8Array, field: number, callback: (value: Uint8Array) => void): void {
  const reader = new ProtoReader(bytes);
  while (!reader.done) {
    const tag = reader.readTag();
    if (tag.field === field && tag.wire === 2) callback(reader.readBytes());
    else reader.skip(tag.wire);
  }
}

export function decodeOtlpTraceSpans(bytes: Uint8Array, maxSpans: number): readonly DecodedOtlpRecord[] {
  if (!(bytes instanceof Uint8Array) || !Number.isInteger(maxSpans) || maxSpans < 1) throw new Error('Invalid protobuf span limit');
  const spans: DecodedOtlpRecord[] = [];
  parseRepeatedMessages(bytes, 1, (resourceSpans) => {
    parseRepeatedMessages(resourceSpans, 2, (scopeSpans) => {
      parseRepeatedMessages(scopeSpans, 2, (span) => {
        if (spans.length >= maxSpans) throw new Error('OTLP protobuf contains too many spans');
        spans.push(parseSpan(span));
      });
    });
  });
  return spans;
}

export function decodeOtelLogRecords(bytes: Uint8Array, maxRecords: number): readonly DecodedOtlpRecord[] {
  if (!(bytes instanceof Uint8Array) || !Number.isInteger(maxRecords) || maxRecords < 1) throw new Error('Invalid protobuf record limit');
  const records: DecodedOtlpRecord[] = [];
  parseRepeatedMessages(bytes, 1, (resourceLogs) => {
    parseRepeatedMessages(resourceLogs, 2, (scopeLogs) => {
      parseRepeatedMessages(scopeLogs, 2, (record) => {
        if (records.length >= maxRecords) throw new Error('OTel protobuf contains too many records');
        records.push(parseLogRecord(record));
      });
    });
  });
  return records;
}
