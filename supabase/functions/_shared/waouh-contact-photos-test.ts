import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractPagePhotos, publicPhotoUrl } from "./waouh-contact-extract.ts";

Deno.test("photo d'annonce : image de partage de la page, adresse relative résolue", () => {
  const html = `<html><head><meta property="og:image" content="/media/iphone-14.jpg"><meta name="twitter:image" content="https://cdn.exemple.bj/a.webp?w=800&amp;h=600"></head></html>`;
  assertEquals(extractPagePhotos(html, "https://annonces.exemple.bj/item/12"), [
    "https://annonces.exemple.bj/media/iphone-14.jpg",
    "https://cdn.exemple.bj/a.webp?w=800&h=600",
  ]);
});

Deno.test("photo d'annonce : logos, adresses non sécurisées ou avec jeton écartés", () => {
  assertEquals(publicPhotoUrl("http://exemple.bj/a.jpg"), null);
  assertEquals(publicPhotoUrl("https://exemple.bj/assets/logo.png"), null);
  assertEquals(publicPhotoUrl("https://exemple.bj/a.jpg?token=abc"), null);
  assertEquals(publicPhotoUrl("https://192.168.1.4/a.jpg"), null);
  assertEquals(extractPagePhotos(`<meta property="og:image" content="https://exemple.bj/favicon.ico">`, "https://exemple.bj/"), []);
});

Deno.test("photo d'annonce : données structurées de la page", () => {
  const html = `<script type="application/ld+json">{"@type":"Product","image":["https://img.exemple.bj/p/1.jpg","https://img.exemple.bj/p/2.jpg"]}</script>`;
  assertEquals(extractPagePhotos(html, "https://exemple.bj/p/1")[0], "https://img.exemple.bj/p/1.jpg");
});
