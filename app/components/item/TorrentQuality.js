import React from 'react';

type TorrentQualityProps = {
  seeders: Object,
  quality: Object,
  onClick: Function
};

const TorrentQuality = ({ onClick, quality, seeders }: TorrentQualityProps) => {
  return (
    <React.Fragment>
      <button
        type="button"
        name="1080p"
        onClick={onClick}
        disabled={!quality['1080p']}
      >
        Start 1080p -- {seeders['1080p']} seeders
      </button>
      <button
        type="button"
        name="720p"
        onClick={onClick}
        disabled={!quality['720p']}
      >
        Start 720p -- {seeders['720p']} seeders
      </button>
      {Object.keys(quality).includes('480p') && (
        <button
          type="button"
          name="480p"
          onClick={onClick}
          disabled={!quality['480p']}
        >
          Start 480p -- {seeders['480p']} seeders
        </button>
      )}
    </React.Fragment>
  );
};

export default TorrentQuality;
