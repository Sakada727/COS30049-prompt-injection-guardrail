import { useEffect, useState } from "react";
import { DEFAULT_MAX_CHARS, getHealth } from "../api/client.js";

export default function useApiStatus() {
  const [status, setStatus] = useState("checking");
  const [maxChars, setMaxChars] = useState(DEFAULT_MAX_CHARS);
  useEffect(() => {
    let alive = true;
    const ping = () =>
      getHealth()
        .then((data) => {
          if (!alive) return;
          setStatus("online");
          if (Number.isInteger(data?.max_text_chars)) setMaxChars(data.max_text_chars);
        })
        .catch(() => alive && setStatus("offline"));
    ping();
    const timer = setInterval(ping, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return { status, maxChars };
}
