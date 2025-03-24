export class SoundPlayer {
    private static audioMap = new Map<string, HTMLAudioElement>();
  
    static play(soundName: string): Promise<void> {
      const audio = new Audio(`/sounds/${soundName}`);
      
      return new Promise((resolve) => {
        audio.addEventListener('ended', () => {
          resolve();
        });
        audio.play().catch(error => {
          console.error('Error playing sound:', error);
          resolve();
        });
      });
    }
  
    static async playSequence(sounds: string[]): Promise<void> {
      for (const sound of sounds) {
        await this.play(sound);
      }
    }
  
    static playOverlap(soundName: string): void {
      const audio = new Audio(`/sounds/${soundName}`);
      audio.play().catch(error => {
        console.error('Error playing overlapped sound:', error);
      });
    }
  }
  