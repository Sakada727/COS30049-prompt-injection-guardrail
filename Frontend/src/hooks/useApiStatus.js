import { useEffect, useState } from "react";
import { getHealth } from "../api/client.js";

export default function useApiStatus() {
  const [status, setStatus] = useState("checking");
  useEffect(() => {
    let alive = true;
    const ping = () =>
      getHealth()
        .then(() => alive && setStatus("online"))
        .catch(() => alive && setStatus("offline"));
    ping();
    const timer = setInterval(ping, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return status;
}
