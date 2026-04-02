import { routeLoader$ } from "@builder.io/qwik-city";

export const useData = routeLoader$(async () => {
  return { message: "Hello from FX-03" };
});

export default () => <div>FX-03 Index Route</div>;
