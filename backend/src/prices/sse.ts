/** Minimal incremental Server-Sent Events parser: feed text chunks, get each event's data. */
export class SseParser {
  private buffer = "";
  private data: string[] = [];

  constructor(private readonly onData: (data: string) => void) {}

  push(chunk: string) {
    this.buffer += chunk;
    let newline: number;
    while ((newline = this.buffer.search(/\r?\n/)) !== -1) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + (this.buffer[newline] === "\r" ? 2 : 1));
      this.line(line);
    }
  }

  private line(line: string) {
    if (line === "") {
      if (this.data.length) this.onData(this.data.join("\n"));
      this.data = [];
    } else if (line.startsWith("data:")) {
      this.data.push(line.slice(5).replace(/^ /, ""));
    }
    // `event:`, `id:`, `retry:` and `:` comments are not used by Hermes price streams.
  }
}
