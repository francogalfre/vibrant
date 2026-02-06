const defaultConfig = `module.exports = {
  // Archivos/carpetas a ignorar
  ignore: ['node_modules', '.git', 'dist', '.next'],

  // Formato de salida: pretty | json | compact
  format: 'pretty'
};
`;

export async function createConfig(): Promise<void> {
  const configPath = "./vibrant.config.js";

  try {
    const file = Bun.file(configPath);
    if (await file.exists()) {
      console.log("⚠️  El archivo vibrant.config.js ya existe");
      return;
    }
  } catch {
    // continuar
  }

  await Bun.write(configPath, defaultConfig);
  console.log("✅ Creado vibrant.config.js");
}
