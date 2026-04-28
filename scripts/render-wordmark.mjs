import { ImageResponse } from "next/og";
import { writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

const fontData = await readFile(join(process.cwd(), "public/fonts/Righteous-Regular.ttf"));

const response = new ImageResponse(
  {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingLeft: 40,
        backgroundColor: "transparent",
      },
      children: {
        type: "span",
        props: {
          style: {
            fontFamily: "Righteous",
            color: "#6B9B6B",
            fontSize: 96,
            letterSpacing: 2,
            lineHeight: 1,
          },
          children: "BackRow",
        },
      },
    },
  },
  {
    width: 600,
    height: 160,
    fonts: [{ name: "Righteous", data: fontData, weight: 400, style: "normal" }],
  }
);

const buffer = await response.arrayBuffer();
await writeFile(join(process.cwd(), "public/wordmark.png"), Buffer.from(buffer));
console.log("Written", buffer.byteLength, "bytes to public/wordmark.png");
