import { Composition } from "remotion";
import { NeuralBackground } from "./NeuralBackground";

export const RemotionRoot = () => (
  <Composition
    id="main"
    component={NeuralBackground}
    durationInFrames={240}
    fps={30}
    width={1080}
    height={1920}
  />
);
