import { describe, expect, it } from "vitest";
import { deviceFamily } from "./securityAlerts";

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const CHROME_MAC_NEWER =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const EDGE_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0";
const FIREFOX_LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0";

describe("deviceFamily", () => {
  it("identifica navegador y sistema", () => {
    expect(deviceFamily(CHROME_MAC)).toBe("Chrome en macOS");
    expect(deviceFamily(SAFARI_IPHONE)).toBe("Safari en iOS");
    expect(deviceFamily(EDGE_WINDOWS)).toBe("Edge en Windows");
    expect(deviceFamily(FIREFOX_LINUX)).toBe("Firefox en Linux");
  });

  it("una actualización de versión NO cambia la familia (no dispara 'dispositivo nuevo')", () => {
    expect(deviceFamily(CHROME_MAC)).toBe(deviceFamily(CHROME_MAC_NEWER));
  });

  it("Edge no se confunde con Chrome (comparten 'Chrome/' en el UA)", () => {
    expect(deviceFamily(EDGE_WINDOWS)).not.toBe("Chrome en Windows");
  });

  it("un UA ausente o vacío no lanza", () => {
    expect(deviceFamily(null)).toBe("Navegador desconocido en sistema desconocido");
    expect(deviceFamily("")).toBe("Navegador desconocido en sistema desconocido");
  });
});
