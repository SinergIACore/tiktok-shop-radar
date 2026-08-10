import { beforeEach, describe, expect, it } from "vitest";

import { buildConnectResponse } from "@/server/tiktok/oauth-response.server";
import {
  consumeOAuthState,
  OAUTH_STATE_COOKIE,
  __resetOAuthStates,
} from "@/server/tiktok/oauth-state.server";

describe("/api/auth/tiktok/connect — resposta 302 com headers mutáveis", () => {
  beforeEach(() => {
    __resetOAuthStates();
    process.env["TIKTOK_SHOP_APP_KEY"] = "app-key-test";
    process.env["TIKTOK_SHOP_APP_SECRET"] = "app-secret-test";
  });

  function connect() {
    return buildConnectResponse(
      new Request("https://app.example.com/api/auth/tiktok/connect"),
    );
  }

  it("retorna 302 para a URL oficial do Creator com app_key e state", () => {
    const response = connect();
    expect(response.status).toBe(302);

    const location = new URL(response.headers.get("Location")!);
    expect(location.origin + location.pathname).toBe(
      "https://shop.tiktok.com/alliance/creator/auth",
    );
    expect(location.searchParams.get("app_key")).toBe("app-key-test");
    expect(location.searchParams.get("state")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("envia o cookie de state com HttpOnly, Secure, SameSite=Lax e TTL de 10 min", () => {
    const setCookie = connect().headers.get("Set-Cookie")!;
    expect(setCookie).toContain(`${OAUTH_STATE_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Max-Age=600");
    expect(setCookie).toContain("Path=/");
  });

  it("o state do cookie é o mesmo da URL e continua single-use", () => {
    const response = connect();
    const state = new URL(response.headers.get("Location")!).searchParams.get("state")!;
    const cookieState = /tiktok_oauth_state=([0-9a-f]{64})/.exec(
      response.headers.get("Set-Cookie")!,
    )![1]!;
    expect(cookieState).toBe(state);
    expect(consumeOAuthState(state, cookieState)).toBe("ok");
    expect(consumeOAuthState(state, cookieState)).toBe("state_mismatch");
  });

  it("headers podem ser enumerados, clonados e mutados sem TypeError: immutable", () => {
    const response = connect();
    expect(() => {
      [...response.headers.entries()];
      const clone = new Headers(response.headers);
      clone.set("x-test", "1");
      response.headers.set("x-merged", "1");
      response.headers.delete("x-merged");
      response.headers.delete("Cache-Control");
    }).not.toThrow();
  });

  it("não usa Response.redirect() (que produz headers imutáveis)", () => {
    const native = Response.redirect("https://example.com", 302);
    expect(() => native.headers.delete("Location")).toThrow();
    expect(() => connect().headers.delete("Location")).not.toThrow();
  });

  it("sem credenciais, redireciona para /settings sem emitir cookie", () => {
    delete process.env["TIKTOK_SHOP_APP_KEY"];
    delete process.env["TIKTOK_SHOP_APP_SECRET"];
    const response = connect();
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("/settings?tiktok=error");
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });
});
