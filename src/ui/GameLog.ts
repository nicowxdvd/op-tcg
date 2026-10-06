export const LOG_WINDOW = 50


export class GameLog {

  private lines: string[] = []
  private offset = 0

  add(line: string): void {
    this.lines.push(line)

    if (this.offset > 0)
      this.offset++

  }


  scroll(delta: number): void {
    this.offset = Math.min(Math.max(0, this.offset + delta), Math.max(0, this.lines.length - 1))

  }


  visible(): string[] {
    const end = this.lines.length - this.offset

    return this.lines.slice(Math.max(0, end - LOG_WINDOW), end)

  }


  size(): number {
    return this.lines.length

  }

}
