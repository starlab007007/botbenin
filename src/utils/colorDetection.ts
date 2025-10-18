// Détecte la couleur dominante du fond d'une image en analysant les bords
export const detectBackgroundColor = async (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Échantillonner les pixels des bords de l'image
      const samples: { r: number; g: number; b: number }[] = [];
      const sampleSize = 20; // Nombre de pixels à échantillonner sur chaque bord
      
      // Bord supérieur
      for (let i = 0; i < sampleSize; i++) {
        const x = Math.floor((img.width / sampleSize) * i);
        const pixel = ctx.getImageData(x, 0, 1, 1).data;
        samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
      }
      
      // Bord inférieur
      for (let i = 0; i < sampleSize; i++) {
        const x = Math.floor((img.width / sampleSize) * i);
        const pixel = ctx.getImageData(x, img.height - 1, 1, 1).data;
        samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
      }
      
      // Bord gauche
      for (let i = 0; i < sampleSize; i++) {
        const y = Math.floor((img.height / sampleSize) * i);
        const pixel = ctx.getImageData(0, y, 1, 1).data;
        samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
      }
      
      // Bord droit
      for (let i = 0; i < sampleSize; i++) {
        const y = Math.floor((img.height / sampleSize) * i);
        const pixel = ctx.getImageData(img.width - 1, y, 1, 1).data;
        samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
      }
      
      // Calculer la couleur moyenne
      const avgColor = samples.reduce(
        (acc, color) => ({
          r: acc.r + color.r,
          g: acc.g + color.g,
          b: acc.b + color.b,
        }),
        { r: 0, g: 0, b: 0 }
      );
      
      avgColor.r = Math.round(avgColor.r / samples.length);
      avgColor.g = Math.round(avgColor.g / samples.length);
      avgColor.b = Math.round(avgColor.b / samples.length);
      
      // Retourner la couleur en format RGB
      resolve(`rgb(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
};
