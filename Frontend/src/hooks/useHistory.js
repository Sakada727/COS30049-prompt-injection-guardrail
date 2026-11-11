import { useCallback, useEffect, useState } from "react";
import { clearHistory, getHistory, startNewSession } from "../api/client.js";

const LIMIT = 50;

export default function useHistory() {
  const [items, setItems] = useState([]);
  const [source, setSource] = useState("server");

  const fetchFromServer = useCallback(
    () =>
      getHistory().then((rows) => {
        setItems(rows);
        setSource("server");
      }),
    [],
  );

  useEffect(() => {
    getHistory()
      .then((rows) => setItems(rows))
      .catch(() => setSource("local"));
  }, []);

  const record = useCallback(
    (entry) =>
      fetchFromServer().catch(() => {
        setSource("local");
        setItems((prev) => [entry, ...prev].slice(0, LIMIT));
      }),
    [fetchFromServer],
  );

  const reset = useCallback(() => {
    clearHistory().catch(() => {});
    startNewSession();
    setItems([]);
  }, []);

  return { items, source, record, reset };
}
