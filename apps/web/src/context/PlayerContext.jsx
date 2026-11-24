import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const [current, setCurrent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Fila de reprodução (usada nas playlists): ao terminar uma faixa, toca a próxima.
  const [queue, setQueue] = useState([]);
  const queueRef = useRef([]);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;

    function handleTimeUpdate() {
      setProgress(audio.currentTime || 0);
      setDuration(audio.duration || 0);
    }

    function handleEnded() {
      setIsPlaying(false);
      const list = queueRef.current;
      const index = list.findIndex((item) => item.audioUrl === audio.src || item.id === audio.dataset.trackId);
      if (index >= 0 && index < list.length - 1) {
        playTrackRef.current?.(list[index + 1]);
      }
    }

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  function setObjectUrl(url) {
    if (objectUrlRef.current && objectUrlRef.current !== url) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = url;
  }

  async function playTrack(track) {
    if (!track?.audioUrl) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.dataset.trackId = track.id || "";

    if (track.isObjectUrl) {
      setObjectUrl(track.audioUrl);
    }

    if (audio.src !== track.audioUrl) {
      audio.src = track.audioUrl;
    }

    audio.volume = volume;
    setCurrent(track);
    await audio.play();
    setIsPlaying(true);
  }

  const playTrackRef = useRef(null);
  playTrackRef.current = playTrack;

  async function playQueue(tracks, startIndex = 0) {
    const list = (tracks || []).filter((item) => item?.audioUrl);
    queueRef.current = list;
    setQueue(list);
    if (list[startIndex]) await playTrack(list[startIndex]);
  }

  function step(offset) {
    const list = queueRef.current;
    const index = list.findIndex((item) => item.id === current?.id);
    const next = list[index + offset];
    if (next) playTrack(next);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    audio.play();
    setIsPlaying(true);
  }

  function seek(value) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
  }

  function stop() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = "";
    setIsPlaying(false);
    setCurrent(null);
    setProgress(0);
    setDuration(0);
  }

  const value = useMemo(
    () => ({
      current,
      isPlaying,
      progress,
      duration,
      volume,
      drawerOpen,
      setDrawerOpen,
      setVolume,
      playTrack,
      playQueue,
      queue,
      next: () => step(1),
      previous: () => step(-1),
      togglePlay,
      seek,
      stop,
    }),
    [current, isPlaying, progress, duration, volume, drawerOpen, queue]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  return useContext(PlayerContext);
}
