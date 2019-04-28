import React from 'react';

type LoadingStatusProps = {
  isLoading: Boolean,
  isFetching: Boolean
};

const LoadingStatus = ({ isLoading, isFetching }: LoadingStatusProps) => {
  let message = '';
  if (isLoading) {
    message = 'Loading torrent...';
  }

  if (isFetching) {
    message = 'Fetching torrents...';
  }

  return <div className="Item--loading-status">{message}</div>;
};

export default LoadingStatus;
