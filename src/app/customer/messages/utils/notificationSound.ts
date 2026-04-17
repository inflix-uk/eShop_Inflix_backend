/**
 * Notification Sound Utility
 * Plays notification sound when new messages are received
 */

let audio: HTMLAudioElement | null = null;

/**
 * Initialize the audio element
 */
const initializeAudio = (): HTMLAudioElement => {
  if (!audio) {
    audio = new Audio('/notification.wav');
    audio.volume = 0.5; // Set volume to 50%
  }
  return audio;
};

/**
 * Play notification sound
 * @param force - Force play even if user hasn't interacted (may be blocked by browser)
 */
export const playNotificationSound = async (force: boolean = false): Promise<void> => {
  try {
    const audioElement = initializeAudio();

    // Reset audio to beginning
    audioElement.currentTime = 0;

    // Play the sound
    const playPromise = audioElement.play();

    if (playPromise !== undefined) {
      await playPromise;
    }
  } catch (error) {
    // Browser may block autoplay - this is expected
    if (!force) {
      console.log('Notification sound blocked by browser. User interaction required.');
    } else {
      console.error('Error playing notification sound:', error);
    }
  }
};

/**
 * Set notification sound volume
 * @param volume - Volume level (0.0 to 1.0)
 */
export const setNotificationVolume = (volume: number): void => {
  const audioElement = initializeAudio();
  audioElement.volume = Math.max(0, Math.min(1, volume));
};
