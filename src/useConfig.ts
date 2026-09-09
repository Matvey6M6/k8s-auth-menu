import React from "react";
import { config, ConfigModel } from "./config";

export function useConfig(): ConfigModel {
  const [state, setState] = React.useState<ConfigModel>(() => config.get());

  React.useEffect(() => {
    setState(config.get());

    const unsubscribe = config.subscribe(setState);

    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}