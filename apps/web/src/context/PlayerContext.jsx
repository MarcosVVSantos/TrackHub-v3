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

    if (track.isObjectUrl) {
      setObjectUrl(track.audioUrl);
    }

    if (audio.src !== track.audioUrl) {
      audio.src = track.audioUrl;
    }

    setCurrent(track);
    await audio.play();
    setIsPlaying(true);
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
    audio.currentTime = 0;
    setIsPlaying(false);
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
      togglePlay,
      seek,
      stop,
    }),
    [current, isPlaying, progress, duration, volume, drawerOpen]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  return useContext(PlayerContext);
}
