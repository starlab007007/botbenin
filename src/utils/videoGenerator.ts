/**
 * Video Generator - Canvas-based animation engine for AI Videography
 * Animates product images in generated environments and records to MP4
 */

export interface VideoAssets {
  productImage: string; // base64 or URL
  environmentImage: string;
  elementsImage?: string;
  isComposed?: boolean; // If true, productImage is already composed with environment
}

export interface VideoConfig {
  animationType: 'product-rotation' | 'environment-story' | 'dynamic-showcase' | 'minimal-motion';
  duration: number; // seconds
  width: number;
  height: number;
  fps: number;
  textOverlay?: {
    title?: string;
    subtitle?: string;
    cta?: string;
  };
}

export class VideoGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: VideoConfig;
  private assets: VideoAssets;
  private loadedImages: Map<string, HTMLImageElement> = new Map();

  constructor(canvas: HTMLCanvasElement, config: VideoConfig, assets: VideoAssets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.assets = assets;
    
    this.canvas.width = config.width;
    this.canvas.height = config.height;
  }

  async loadAssets(): Promise<void> {
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    // If already composed, load as single composed image
    if (this.assets.isComposed) {
      const composed = await loadImage(this.assets.productImage);
      this.loadedImages.set('composed', composed);
    } else {
      const product = await loadImage(this.assets.productImage);
      const environment = await loadImage(this.assets.environmentImage);
      
      this.loadedImages.set('product', product);
      this.loadedImages.set('environment', environment);
    }

    if (this.assets.elementsImage) {
      const elements = await loadImage(this.assets.elementsImage);
      this.loadedImages.set('elements', elements);
    }
  }

  renderFrame(frameNumber: number, totalFrames: number): void {
    const progress = frameNumber / totalFrames;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    switch (this.config.animationType) {
      case 'product-rotation':
        this.renderProductRotation(progress);
        break;
      case 'environment-story':
        this.renderEnvironmentStory(progress);
        break;
      case 'dynamic-showcase':
        this.renderDynamicShowcase(progress);
        break;
      case 'minimal-motion':
        this.renderMinimalMotion(progress);
        break;
    }

    // Add text overlays
    if (this.config.textOverlay) {
      this.renderTextOverlays(progress);
    }
  }

  private renderProductRotation(progress: number): void {
    // If image is already composed, apply animation to the entire composed image
    if (this.assets.isComposed) {
      const composed = this.loadedImages.get('composed')!;
      
      // Calculate rotation and scale
      const angle = progress * Math.PI * 2; // Full 360° rotation
      const scale = 0.95 + Math.sin(progress * Math.PI * 2) * 0.05; // Subtle scale pulse
      
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;

      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(angle);
      this.ctx.scale(scale, scale);
      this.ctx.drawImage(
        composed,
        -this.canvas.width / 2,
        -this.canvas.height / 2,
        this.canvas.width,
        this.canvas.height
      );
      this.ctx.restore();
      return;
    }

    // Fallback: separate images
    const environment = this.loadedImages.get('environment')!;
    const product = this.loadedImages.get('product')!;

    this.ctx.drawImage(environment, 0, 0, this.canvas.width, this.canvas.height);

    const angle = progress * Math.PI * 2;
    const scale = 0.8 + Math.sin(progress * Math.PI * 2) * 0.1;
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const productSize = Math.min(this.canvas.width, this.canvas.height) * 0.6;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(angle);
    this.ctx.scale(scale, scale);
    this.ctx.drawImage(product, -productSize / 2, -productSize / 2, productSize, productSize);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY + productSize * 0.4, productSize * 0.4, productSize * 0.1, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private renderEnvironmentStory(progress: number): void {
    // If already composed, apply cinematic zoom
    if (this.assets.isComposed) {
      const composed = this.loadedImages.get('composed')!;
      const scale = 1.3 - progress * 0.3; // Zoom from 1.3x to 1.0x
      const offsetX = (this.canvas.width * scale - this.canvas.width) / 2;
      const offsetY = (this.canvas.height * scale - this.canvas.height) / 2;
      
      this.ctx.drawImage(
        composed,
        -offsetX,
        -offsetY,
        this.canvas.width * scale,
        this.canvas.height * scale
      );
      return;
    }

    // Fallback: separate images
    const environment = this.loadedImages.get('environment')!;
    const product = this.loadedImages.get('product')!;
    const elements = this.loadedImages.get('elements');

    // Phase 1: Environment zoom in (0-0.3)
    if (progress < 0.3) {
      const zoomProgress = progress / 0.3;
      const scale = 1.5 - zoomProgress * 0.5; // 1.5 → 1.0
      const offsetX = (this.canvas.width * scale - this.canvas.width) / 2;
      const offsetY = (this.canvas.height * scale - this.canvas.height) / 2;
      
      this.ctx.drawImage(
        environment,
        -offsetX,
        -offsetY,
        this.canvas.width * scale,
        this.canvas.height * scale
      );
    }
    // Phase 2: Product appears (0.3-0.6)
    else if (progress < 0.6) {
      this.ctx.drawImage(environment, 0, 0, this.canvas.width, this.canvas.height);
      
      const appearProgress = (progress - 0.3) / 0.3;
      const productScale = appearProgress;
      const productAlpha = appearProgress;
      
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const productSize = Math.min(this.canvas.width, this.canvas.height) * 0.5;

      this.ctx.save();
      this.ctx.globalAlpha = productAlpha;
      this.ctx.translate(centerX, centerY);
      this.ctx.scale(productScale, productScale);
      this.ctx.drawImage(
        product,
        -productSize / 2,
        -productSize / 2,
        productSize,
        productSize
      );
      this.ctx.restore();
    }
    // Phase 3: Final composition with elements (0.6-1.0)
    else {
      this.ctx.drawImage(environment, 0, 0, this.canvas.width, this.canvas.height);
      
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const productSize = Math.min(this.canvas.width, this.canvas.height) * 0.5;

      this.ctx.drawImage(
        product,
        centerX - productSize / 2,
        centerY - productSize / 2,
        productSize,
        productSize
      );

      if (elements) {
        const elementProgress = (progress - 0.6) / 0.4;
        this.ctx.save();
        this.ctx.globalAlpha = elementProgress;
        this.ctx.drawImage(elements, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
      }
    }
  }

  private renderDynamicShowcase(progress: number): void {
    // If already composed, apply dynamic movement
    if (this.assets.isComposed) {
      const composed = this.loadedImages.get('composed')!;
      const offset = Math.sin(progress * Math.PI * 2) * 50;
      const scale = 0.95 + Math.sin(progress * Math.PI * 4) * 0.1;
      
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;

      this.ctx.save();
      this.ctx.translate(centerX + offset, centerY);
      this.ctx.scale(scale, scale);
      this.ctx.drawImage(composed, -this.canvas.width / 2, -this.canvas.height / 2, this.canvas.width, this.canvas.height);
      this.ctx.restore();
      return;
    }

    // Fallback: separate images
    const environment = this.loadedImages.get('environment')!;
    const product = this.loadedImages.get('product')!;

    const envOffset = Math.sin(progress * Math.PI * 2) * 50;
    this.ctx.drawImage(environment, envOffset, 0, this.canvas.width, this.canvas.height);

    // Product with dramatic movement
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const productSize = Math.min(this.canvas.width, this.canvas.height) * 0.6;

    // Circular motion path
    const radius = 100;
    const angle = progress * Math.PI * 2;
    const offsetX = Math.cos(angle) * radius;
    const offsetY = Math.sin(angle) * radius * 0.5;

    // Scale variation
    const scale = 0.9 + Math.sin(progress * Math.PI * 4) * 0.15;

    this.ctx.save();
    this.ctx.translate(centerX + offsetX, centerY + offsetY);
    this.ctx.scale(scale, scale);
    this.ctx.drawImage(
      product,
      -productSize / 2,
      -productSize / 2,
      productSize,
      productSize
    );
    this.ctx.restore();

    // Add dynamic light effect
    const gradient = this.ctx.createRadialGradient(
      centerX + offsetX,
      centerY + offsetY,
      0,
      centerX + offsetX,
      centerY + offsetY,
      productSize
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.ctx.save();
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  private renderMinimalMotion(progress: number): void {
    // If already composed, apply subtle breathing effect
    if (this.assets.isComposed) {
      const composed = this.loadedImages.get('composed')!;
      const breathe = 1 + Math.sin(progress * Math.PI * 2) * 0.02;
      const size = this.canvas.width * breathe;
      const offset = (size - this.canvas.width) / 2;

      this.ctx.drawImage(composed, -offset, -offset, size, size);
      return;
    }

    // Fallback: separate images
    const environment = this.loadedImages.get('environment')!;
    const product = this.loadedImages.get('product')!;

    const breathe = 1 + Math.sin(progress * Math.PI * 2) * 0.02;
    const envSize = this.canvas.width * breathe;
    const envOffset = (envSize - this.canvas.width) / 2;

    this.ctx.drawImage(environment, -envOffset, -envOffset, envSize, envSize);

    // Product with minimal floating motion
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const productSize = Math.min(this.canvas.width, this.canvas.height) * 0.5;
    const floatY = Math.sin(progress * Math.PI * 2) * 20;

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 30;
    this.ctx.shadowOffsetY = 10;
    this.ctx.drawImage(
      product,
      centerX - productSize / 2,
      centerY - productSize / 2 + floatY,
      productSize,
      productSize
    );
    this.ctx.restore();
  }

  private renderTextOverlays(progress: number): void {
    const { title, subtitle, cta } = this.config.textOverlay!;

    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 10;

    // Title appears early (0-0.3)
    if (title && progress > 0.05) {
      const titleAlpha = Math.min((progress - 0.05) / 0.25, 1);
      this.ctx.globalAlpha = titleAlpha;
      this.ctx.font = 'bold 48px Arial';
      this.ctx.fillStyle = 'white';
      this.ctx.fillText(title, this.canvas.width / 2, 100);
    }

    // Subtitle appears mid-way (0.3-0.5)
    if (subtitle && progress > 0.3) {
      const subtitleAlpha = Math.min((progress - 0.3) / 0.2, 1);
      this.ctx.globalAlpha = subtitleAlpha;
      this.ctx.font = '32px Arial';
      this.ctx.fillStyle = 'white';
      this.ctx.fillText(subtitle, this.canvas.width / 2, 160);
    }

    // CTA appears at end (0.7-0.9)
    if (cta && progress > 0.7) {
      const ctaAlpha = Math.min((progress - 0.7) / 0.2, 1);
      this.ctx.globalAlpha = ctaAlpha;
      
      // CTA with background
      const ctaWidth = 300;
      const ctaHeight = 60;
      const ctaX = this.canvas.width / 2 - ctaWidth / 2;
      const ctaY = this.canvas.height - 120;

      this.ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
      this.ctx.fillRect(ctaX, ctaY, ctaWidth, ctaHeight);
      
      this.ctx.font = 'bold 28px Arial';
      this.ctx.fillStyle = 'white';
      this.ctx.fillText(cta, this.canvas.width / 2, ctaY + 38);
    }

    this.ctx.restore();
  }

  async animate(onProgress?: (progress: number) => void): Promise<void> {
    const totalFrames = this.config.duration * this.config.fps;
    
    for (let frame = 0; frame < totalFrames; frame++) {
      this.renderFrame(frame, totalFrames);
      
      if (onProgress) {
        onProgress(frame / totalFrames);
      }

      // Allow browser to render
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  }
}
