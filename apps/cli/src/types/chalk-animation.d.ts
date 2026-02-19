declare module 'chalk-animation' {
  interface ChalkAnimation {
    (text: string, speed?: number): { start(): void; stop(): void };
    rainbow: ChalkAnimation;
    pulse: ChalkAnimation;
    glitch: ChalkAnimation;
    radar: ChalkAnimation;
    neon: ChalkAnimation;
    karaoke: ChalkAnimation;
  }
  
  const chalkAnimation: ChalkAnimation;
  export default chalkAnimation;
}
