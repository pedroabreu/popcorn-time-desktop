import React, { useEffect, useRef } from 'react';
import Plyr from '@amilajack/react-plyr';
import Player from '../../api/Player';

type Props = {
  captions: Object,
  url: string,
  item: Object,
  onClose: Function
};

const VideoPlayer = function VideoPlayer({
  captions,
  url,
  item,
  onClose
}: Props) {
  const playerRef = useRef(null);
  useEffect(() => Player.setPlayer(playerRef.current), []);

  return (
    <React.Fragment>
      <Plyr
        captions={captions}
        type="video"
        url={url}
        poster={(item && item.images && item.images.fanart.full) || ''}
        title={item.title || ''}
        volume={10}
        onEnterFullscreen={() => {
          document.querySelector('.plyr').style.height = '100%';
        }}
        onExitFullscreen={() => {
          document.querySelector('.plyr').style.height = '0px';
        }}
        ref={playerRef}
      />

      {url && (
        <span
          data-e2e="close-player"
          role="presentation"
          id="close-button"
          onClick={onClose}
        >
          <i className="ion-md-close" />
        </span>
      )}
    </React.Fragment>
  );
};

export default VideoPlayer;
