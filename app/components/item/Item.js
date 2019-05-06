/**
 * Movie component that is responsible for playing movies
 * @flow
 */
import React, { Component } from 'react';
import { Container, Row, Col } from 'reactstrap';
import classNames from 'classnames';
import notie from 'notie';
import os from 'os';
import yifysubtitles from '@amilajack/yifysubtitles';
import SaveItem from '../metadata/SaveItem';
import Description from './Description';
import Poster from './Poster';
import BackButton from './BackButton';
import Similar from './Similar';
import SelectPlayer from './SelectPlayer';
import VideoPlayer from './VideoPlayer';
import LoadingStatus from './LoadingStatus';
import TorrentQuality from './TorrentQuality';
import Show from '../show/Show';
import ChromecastPlayerProvider from '../../api/players/ChromecastPlayerProvider';
import { getIdealTorrent } from '../../api/torrents/BaseTorrentProvider';
import Butter from '../../api/Butter';
import Torrent from '../../api/Torrent';
import SubtitleServer, { languages as langs } from '../../api/Subtitle';
import Player from '../../api/Player';
import type {
  contentType,
  imagesType
} from '../../api/metadata/MetadataProviderInterface';
import type {
  torrentType,
  qualityType
} from '../../api/torrents/TorrentProviderInterface';

type playerType = 'default' | 'plyr' | 'vlc' | 'chromecast' | 'youtube';

type torrentSelectionType = {
  default: torrentType,
  [quality: qualityType]: torrentType
};

type Props = {
  itemId?: string,
  activeMode?: string
};

type itemType = contentType & {
  images: ?imagesType
};

type captionsType = Array<{
  src: string,
  srclang: string
}>;

type State = {
  item: itemType,
  selectedSeason: number,
  selectedEpisode: number,
  seasons: [],
  season: [],
  episodes: [],
  currentPlayer: playerType,
  playbackInProgress: boolean,
  fetchingTorrents: boolean,
  idealTorrent: torrentType,
  torrent: torrentSelectionType,
  servingUrl: string,
  torrentInProgress: boolean,
  torrentProgress: number,
  captions: captionsType,
  favorites: Array<itemType>,
  watchList: Array<itemType>
};

export default class Item extends Component<Props, State> {
  props: Props;

  state: State;

  defaultTorrent: torrentSelectionType = {
    default: {
      quality: undefined,
      magnet: undefined,
      health: undefined,
      method: undefined,
      seeders: 0
    },
    '1080p': {
      quality: undefined,
      magnet: undefined,
      health: undefined,
      method: undefined,
      seeders: 0
    },
    '720p': {
      quality: undefined,
      magnet: undefined,
      health: undefined,
      method: undefined,
      seeders: 0
    },
    '480p': {
      quality: undefined,
      magnet: undefined,
      health: undefined,
      method: undefined,
      seeders: 0
    }
  };

  initialState: State = {
    item: {
      id: '',
      rating: 'n/a',
      summary: '',
      title: '',
      trailer: '',
      type: '',
      year: 0,
      certification: 'n/a',
      genres: [],
      images: {
        poster: {},
        fanart: {}
      },
      runtime: {
        full: '',
        hours: 0,
        minutes: 0
      }
    },
    servingUrl: undefined,
    selectedSeason: 1,
    selectedEpisode: 1,
    selectedQuality: null,
    seasons: [],
    season: [],
    episode: {},
    currentPlayer: 'default',
    playbackInProgress: false,
    fetchingTorrents: false,
    idealTorrent: this.defaultTorrent,
    torrent: this.defaultTorrent,
    metadataLoading: false,
    torrentInProgress: false,
    torrentProgress: 0,
    captions: [],
    favorites: [],
    watchList: []
  };

  constructor(props: Props) {
    super(props);

    this.state = this.initialState;
  }

  static defaultProps: Props;

  /**
   * Check which players are available on the system
   */
  setPlayer = ({ target: { name: player, id } }: Event<HTMLButtonElement>) => {
    if (['youtube', 'default'].includes(player)) {
      Player.setPlayer(this.plyr);
      this.toggleActive();
    }

    if (player === 'chromecast') {
      ChromecastPlayerProvider.selectDevice(id);
    }

    this.setState({ currentPlayer: player });
  };

  async componentDidMount() {
    const { itemId } = this.props;
    window.scrollTo(0, 0);

    Player.setPlayer(this.plyr);

    this.stopPlayback();
    Player.destroy();

    this.setState({
      ...this.initialState,
      currentPlayer: 'default',
      favorites: await Butter.favorites('get'),
      watchList: await Butter.watchList('get')
    });

    this.getAllData(itemId);

    SubtitleServer.startServer();
  }

  componentWillReceiveProps(nextProps: Props) {
    window.scrollTo(0, 0);
    this.stopPlayback();
    this.setState({
      ...this.initialState
    });
    this.getAllData(nextProps.itemId);
  }

  componentWillUnmount() {
    this.stopPlayback();
    Player.destroy();
    SubtitleServer.closeServer();
  }

  getAllData(itemId: string) {
    const { activeMode } = this.props;
    const { selectedSeason, selectedEpisode } = this.state;
    this.setState(this.initialState, () => {
      if (activeMode === 'shows') {
        this.getShowData('seasons', itemId, selectedSeason, selectedEpisode);
      }
    });

    return Promise.all([
      this.getItem(itemId).then((item: contentType) =>
        Promise.all([
          this.getCaptions(item),
          this.getTorrent(item.ids.imdbId, item.title, 1, 1)
        ])
      )
    ]);
  }

  async getShowData(type: string, imdbId: string, season?: number) {
    switch (type) {
      case 'seasons':
        this.setState({ seasons: [], episodes: [] });
        this.setState({
          seasons: await Butter.getSeasons(imdbId),
          episodes: await Butter.getSeason(imdbId, 1)
        });
        break;
      case 'episodes':
        if (!season) {
          throw new Error('"season" not provided to getShowData()');
        }
        this.setState({ episodes: [] });
        this.setState({
          episodes: await Butter.getSeason(imdbId, season)
        });
        break;
      default:
        throw new Error('Invalid getShowData() type');
    }
  }

  /**
   * Get the details of a movie using the butter api
   */
  async getItem(imdbId: string) {
    const { activeMode } = this.props;

    const item = await (() => {
      switch (activeMode) {
        case 'movies':
          return Butter.getMovie(imdbId);
        case 'shows':
          return Butter.getShow(imdbId);
        default:
          throw new Error('Active mode not found');
      }
    })();

    this.setState({ item });

    return item;
  }

  async getTorrent(
    imdbId: string,
    title: string,
    season: number,
    episode: number
  ) {
    const { activeMode } = this.props;
    this.setState({
      fetchingTorrents: true,
      idealTorrent: this.defaultTorrent,
      torrent: this.defaultTorrent
    });

    try {
      const { torrent, idealTorrent } = await (async () => {
        switch (activeMode) {
          case 'movies': {
            const originalTorrent = await Butter.getTorrent(
              imdbId,
              activeMode,
              {
                searchQuery: title
              }
            );
            return {
              torrent: originalTorrent,
              idealTorrent: getIdealTorrent([
                originalTorrent['1080p'],
                originalTorrent['720p'],
                originalTorrent['480p']
              ])
            };
          }
          case 'shows': {
            if (process.env.FLAG_SEASON_COMPLETE === 'true') {
              const [shows, seasonComplete] = await Promise.all([
                Butter.getTorrent(imdbId, activeMode, {
                  season,
                  episode,
                  searchQuery: title
                }),
                Butter.getTorrent(imdbId, 'season_complete', {
                  season,
                  searchQuery: title
                })
              ]);

              return {
                torrent: {
                  '1080p': getIdealTorrent([
                    shows['1080p'],
                    seasonComplete['1080p']
                  ]),
                  '720p': getIdealTorrent([
                    shows['720p'],
                    seasonComplete['720p']
                  ]),
                  '480p': getIdealTorrent([
                    shows['480p'],
                    seasonComplete['480p']
                  ])
                },
                idealTorrent: getIdealTorrent([
                  shows['1080p'],
                  shows['720p'],
                  shows['480p'],
                  seasonComplete['1080p'],
                  seasonComplete['720p'],
                  seasonComplete['480p']
                ])
              };
            }

            const singleEpisodeTorrent = await Butter.getTorrent(
              imdbId,
              activeMode,
              {
                season,
                episode,
                searchQuery: title
              }
            );

            return {
              torrent: singleEpisodeTorrent,
              idealTorrent: getIdealTorrent([
                singleEpisodeTorrent['1080p'] || this.defaultTorrent,
                singleEpisodeTorrent['720p'] || this.defaultTorrent,
                singleEpisodeTorrent['480p'] || this.defaultTorrent
              ])
            };
          }
          default:
            throw new Error('Invalid active mode');
        }
      })();

      if (idealTorrent && idealTorrent.quality === 'poor') {
        notie.alert(2, 'Slow torrent, low seeder count', 1);
      }

      if (idealTorrent) {
        this.setState({
          idealTorrent
        });
      }

      this.setState({
        fetchingTorrents: false,
        selectedQuality: torrent['1080p']
          ? '1080p'
          : torrent['720p']
          ? '720p'
          : torrent['480p']
          ? '480p'
          : undefined,
        torrent: {
          '1080p': torrent['1080p'] || this.defaultTorrent,
          '720p': torrent['720p'] || this.defaultTorrent,
          '480p': torrent['480p'] || this.defaultTorrent
        }
      });

      return torrent;
    } catch (error) {
      console.log(error);
    }

    return {};
  }

  stopPlayback = () => {
    const { torrentInProgress, playbackInProgress, currentPlayer } = this.state;
    if (!torrentInProgress && !playbackInProgress) {
      return;
    }
    if (['youtube', 'default'].includes(currentPlayer)) {
      Player.pause();
    }

    Player.destroy();
    Torrent.destroy();
    this.setState({ torrentInProgress: false });
  };

  selectShow = (
    type: string,
    selectedSeason: number,
    selectedEpisode: number = 1
  ) => {
    const { item } = this.state;
    switch (type) {
      case 'episodes':
        this.setState({ selectedSeason });
        this.getShowData('episodes', item.ids.tmdbId, selectedSeason);
        this.selectShow('episode', selectedSeason, 1);
        break;
      case 'episode':
        this.setState({ selectedSeason, selectedEpisode });
        this.getShowData(
          'episode',
          item.ids.tmdbId,
          selectedSeason,
          selectedEpisode
        );
        this.getTorrent(
          item.ids.imdbId,
          item.title,
          selectedSeason,
          selectedEpisode
        );
        break;
      default:
        throw new Error('Invalid selectShow() type');
    }
  };

  /**
   * 1. Retrieve list of subtitles
   * 2. If the torrent has subtitles, get the subtitle buffer
   * 3. Convert the buffer (srt) to vtt, save the file to a tmp dir
   * 4. Serve the file through http
   * 5. Override the default subtitle retrieved from the API
   */
  async getCaptions(item: contentType): Promise<captionsType> {
    const captions: Array<captionsType> = await yifysubtitles(item.ids.imdbId, {
      path: os.tmpdir(),
      langs
    })
      .then(res =>
        res.map(subtitle => ({
          // Set the default language for subtitles
          default: subtitle.langShort === process.env.DEFAULT_TORRENT_LANG,
          kind: 'captions',
          label: subtitle.langShort,
          srclang: subtitle.langShort,
          src: `http://localhost:${SubtitleServer.port}/${subtitle.fileName}`
        }))
      )
      .catch(console.log);

    this.setState({
      captions
    });

    return captions;
  }

  closeVideo = () => {
    const { playbackInProgress } = this.state;
    if (!playbackInProgress) {
      return;
    }
    this.toggleActive();
    this.stopPlayback();
    this.setState({
      currentPlayer: 'default'
    });
  };

  toggleActive() {
    this.setState(prevState => ({
      playbackInProgress: !prevState.playbackInProgress
    }));
  }

  setQuality = ({
    target: { name: playbackQuality }
  }: Event<HTMLButtonElement>) => {
    this.setState({
      selectedQuality: playbackQuality
    });
  };

  startPlayback = async () => {
    const {
      currentPlayer,
      torrentInProgress,
      selectedEpisode,
      selectedSeason,
      selectedQuality,
      item,
      captions,
      torrent
    } = this.state;

    const { magnet, method: activeMode } = torrent[selectedQuality];

    if (torrentInProgress) {
      this.stopPlayback();
    }
    if (!magnet || !activeMode) {
      return;
    }

    this.setState({
      servingUrl: undefined,
      torrentInProgress: true
    });

    const metadata = {
      activeMode,
      season: selectedSeason,
      episode: selectedEpisode
    };

    const formats = [
      ...Player.experimentalPlaybackFormats,
      ...Player.nativePlaybackFormats
    ];

    await Torrent.start(
      magnet,
      metadata,
      formats,
      async (
        servingUrl: string,
        file: { name: string },
        files: string,
        torrentHash: string
      ) => {
        console.log(`Serving torrent at: ${servingUrl}`);

        switch (currentPlayer) {
          case 'VLC':
            return Player.initVLC(servingUrl);
          case 'chromecast': {
            Player.initCast(ChromecastPlayerProvider, servingUrl, item);
            break;
          }
          case 'youtube':
            this.toggleActive();
            setTimeout(() => {
              Player.updateVideoSource(
                servingUrl,
                'video',
                item.title,
                undefined,
                captions
              );
              Player.play();
            }, 3000);
            break;
          case 'default':
            this.toggleActive();
            setTimeout(() => {
              Player.updateVideoSource(
                servingUrl,
                'video',
                item.title,
                undefined,
                captions
              );
              Player.play();
            }, 3000);
            break;
          default:
            console.error('Invalid player');
            break;
        }

        const recentlyWatchedList = await Butter.recentlyWatched('get');
        const containsRecentlyWatchedItem = recentlyWatchedList.some(
          e => e.id === item.id
        );
        if (!containsRecentlyWatchedItem) {
          await Butter.recentlyWatched('set', item);
        }

        this.setState({
          captions,
          servingUrl
        });

        return torrentHash;
      },
      downloaded => {
        console.log('DOWNLOADING', downloaded);
      }
    );
  };

  render() {
    const {
      item,
      idealTorrent,
      torrent,
      servingUrl,
      torrentInProgress,
      fetchingTorrents,
      currentPlayer,
      seasons,
      selectedSeason,
      episodes,
      selectedEpisode,
      playbackInProgress,
      favorites,
      watchList,
      captions
    } = this.state;

    const { activeMode, itemId } = this.props;

    const itemBackgroundUrl = {
      backgroundImage: `url(${item.images.fanart.full})`
    };

    return (
      <Container
        fluid
        className={classNames('Item', { active: playbackInProgress })}
      >
        <BackButton onClick={this.stopPlayback} />
        <Row>
          <VideoPlayer
            captions={captions}
            url={playbackInProgress ? servingUrl || item.trailer : undefined}
            item={item}
            onClose={this.closeVideo}
            forwardedRef={ref => {
              this.plyr = ref;
            }}
          />
          <Col sm="12" className="Item--background" style={itemBackgroundUrl}>
            <Col sm="6" className="Item--image">
              <Poster
                magnetLink={idealTorrent.magnet}
                onClick={this.startPlayback}
                poster={item.images.poster.thumb}
              />
              <LoadingStatus
                isLoading={!servingUrl && torrentInProgress}
                isFetching={fetchingTorrents}
              />
              <SaveItem
                item={item}
                favorites={favorites}
                watchList={watchList}
              />
            </Col>
            <Description
              certification={item.certification}
              genres={item.genres}
              seederCount={idealTorrent.seeders}
              onTrailerClick={() => this.setPlayer('youtube')}
              rating={item.rating}
              runtime={item.runtime}
              summary={item.summary}
              title={item.title}
              torrentHealth={idealTorrent.health}
              trailer={item.trailer}
              year={item.year}
            />
            <div className="Item--overlay" />
          </Col>
        </Row>

        <Row className="row-margin">
          <Col sm="2">
            <SelectPlayer
              chromeCastPlayer={ChromecastPlayerProvider}
              currentSelection={currentPlayer}
              onSelect={this.setPlayer}
            />
          </Col>
          <Col sm="10">
            {process.env.FLAG_MANUAL_TORRENT_SELECTION === 'true' && (
              <TorrentQuality
                onClick={this.setQuality}
                quality={{
                  '1080p': torrent['1080p'].quality,
                  '720p': torrent['720p'].quality,
                  ...(activeMode === 'shows' && {
                    '480p': torrent['480p'].quality
                  })
                }}
                seeders={{
                  '1080p': torrent['1080p'].seeders,
                  '720p': torrent['720p'].seeders,
                  ...(activeMode === 'shows' && {
                    '480p': torrent['480p'].seeders
                  })
                }}
              />
            )}
          </Col>
        </Row>

        {activeMode === 'shows' && (
          <Show
            selectShow={this.selectShow}
            seasons={seasons}
            episodes={episodes}
            selectedSeason={selectedSeason}
            selectedEpisode={selectedEpisode}
          />
        )}

        <Similar itemId={itemId} type={activeMode} />
      </Container>
    );
  }
}

Item.defaultProps = {
  itemId: '',
  activeMode: 'movies'
};
