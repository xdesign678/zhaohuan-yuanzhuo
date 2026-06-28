declare module 'jsfxr' {
  export interface JsfxrWave {
    readonly dataURI: string;
  }

  const jsfxr: {
    readonly sfxr: {
      toWave(params: Record<string, number | boolean>): JsfxrWave;
    };
  };

  export default jsfxr;
}
