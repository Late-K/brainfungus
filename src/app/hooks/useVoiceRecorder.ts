"use client";

// records a voice note with the microphone. stop() hands back the recording
// as a File, cancel() throws it away

import { useCallback, useEffect, useRef, useState } from "react";

// webm/opus on chrome, firefox and android, mp4 on safari
const PREFERRED_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionFor(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setElapsed(0);
  }, []);

  // let go of the microphone if the chat closes mid-recording
  const unmountedRef = useRef(false);
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  const start = useCallback(async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice notes aren't supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // the chat closed while the permission prompt was up - nothing will
      // ever stop this stream, so turn the microphone straight back off
      if (unmountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(250);
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - startedAtRef.current) / 1000);
      }, 250);
    } catch {
      setError("Couldn't use the microphone - check the browser's permissions");
      cleanup();
    }
  }, [cleanup]);

  const stop = useCallback((): Promise<{ file: File; duration: number } | null> => {
    const recorder = recorderRef.current;
    if (!recorder) return Promise.resolve(null);

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const duration = (Date.now() - startedAtRef.current) / 1000;
        const type = (recorder.mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(chunksRef.current, { type });
        cleanup();

        if (blob.size === 0 || duration < 0.5) {
          resolve(null);
          return;
        }
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        resolve({
          file: new File([blob], `voice-note-${stamp}.${extensionFor(type)}`, {
            type,
          }),
          duration,
        });
      };
      recorder.stop();
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanup();
  }, [cleanup]);

  return { isRecording, elapsed, error, setError, start, stop, cancel };
}
