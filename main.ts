import { Application } from "@oak/oak/application"
import { Router } from "@oak/oak/router"
import { parseMediaType } from "https://deno.land/std@0.175.0/media_types/parse_media_type.ts";
import {
  ImageMagick,
  initialize,
  MagickFormat,
} from "imagemagick_deno";

await initialize();

const router = new Router();
router.get("/", async (ctx) => {
  const params = parseParams(ctx.request.url);
  if (typeof params === "string") {
    ctx.response.status = 400;
    ctx.response.body = params;
    return
  }
  const remoteImage = await getRemoteImage(params.image);
  if (typeof remoteImage === "string") {
    ctx.response.status = 400;
    ctx.response.body = remoteImage;
    return;
  }
  const modifiedImage = await modifyImage(remoteImage.buffer);
  ctx.response.body = modifiedImage;
  ctx.response.headers.set("Content-Type", 'image/webp');
});

function modifyImage(
  imageBuffer: Uint8Array
) {
  return new Promise<Uint8Array>((resolve) => {
    ImageMagick.read(imageBuffer, (image) => {
      console.log(image.width, image.height);
      image.quality = 80;
      image.write(MagickFormat.Webp, (data) => resolve(data));
    });
  });
}

function parseParams(reqUrl: URL) {
  const image = reqUrl.searchParams.get("image");
  if (image == null) {
    return "Missing 'image' query parameter.";
  }
  return {
    image
  };
}

async function getRemoteImage(image: string) {
  const sourceRes = await fetch(image);
  if (!sourceRes.ok) {
    return "Error retrieving image from URL.";
  }
  const mediaType = parseMediaType(sourceRes.headers.get("Content-Type")!)[0];
  if (mediaType.split("/")[0] !== "image") {
    return "URL is not image type.";
  }
  return {
    buffer: new Uint8Array(await sourceRes.arrayBuffer()),
    mediaType,
  };
}

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 8080 });
