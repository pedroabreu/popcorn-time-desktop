// @flow
import { remote } from 'electron';
import plyr from 'plyr';
import childProcess from 'child_process';
import network from 'network-address';
import vlcCommand from 'vlc-command';
import ChromecastPlayerProvider from './players/ChromecastPlayerProvider';
import type { metadataType } from './players/PlayerProviderInterface';

export type subtitleType = { kind: string, src: string, srclang: string };

const { powerSaveBlocker } = remote;

class Player {
  currentPlayer = 'plyr';

  powerSaveBlockerId: number;

  /**
   * @private
   */
  player: plyr;

  nativePlaybackFormats = ['mp4', 'ogg', 'mov', 'webmv', 'mkv', 'wmv', 'avi'];

  experimentalPlaybackFormats = [];

  /**
   * Cleanup all traces of the player UI
   */
  destroy() {
    if (this.powerSaveBlockerId) {
      powerSaveBlocker.stop(this.powerSaveBlockerId);
    }
    if (this.player && this.player.destroy) {
      this.player.destroy();
    }
  }

  /**
   * restart they player's state
   */
  restart() {
    this.player.restart();
  }

  static isFormatSupported(
    filename: string,
    mimeTypes: Array<string>
  ): boolean {
    return !!mimeTypes.find(mimeType =>
      filename.toLowerCase().includes(mimeType)
    );
  }

  async initCast(
    provider: ChromecastPlayerProvider,
    streamingUrl: string,
    metadata: metadataType,
    subtitles: Array<subtitleType>
  ) {
    this.powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
    const addr = streamingUrl.replace('localhost', network());
    return provider.play(addr, metadata, subtitles);
  }

  setPlayer(player) {
    this.player = player;
  }

  initYouTube() {
    console.info('Initializing plyr...');
    this.currentPlayer = 'plyr';
    this.player = {};
    return this.player;
  }

  initPlyr(): plyr {
    console.info('Initializing plyr...');
    this.currentPlayer = 'plyr';
    this.powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
    this.player = {};
    return this.player;
  }

  initVLC(servingUrl: string) {
    vlcCommand((error, cmd: string) => {
      if (error) return console.error('Could not find vlc command path');

      if (process.platform === 'win32') {
        childProcess.execFile(cmd, [servingUrl], (_error, stdout) => {
          if (_error) return console.error(_error);
          return console.log(stdout);
        });
      } else {
        childProcess.exec(`${cmd} ${servingUrl}`, (_error, stdout) => {
          if (_error) return console.error(_error);
          return console.log(stdout);
        });
      }

      this.powerSaveBlockerId = powerSaveBlocker.start(
        'prevent-app-suspension'
      );

      return true;
    });
  }

  play() {
    this.player.play();
  }

  pause() {
    this.player.pause();
  }

  updateVideoSource(url, type, title, whatever, captions) {
    this.player.updateHtmlVideoSource(url, type, title, whatever, captions);
  }
}

export default new Player();
