import { useState, useEffect } from "react";
import { apiRequest } from "../api/client";

export function useSubscription() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/subscriptions/me")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
