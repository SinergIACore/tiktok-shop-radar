import { beforeEach, describe, expect, it } from "vitest";

import {
  consumeOAuthState,
  createOAuthState,
  __resetOAuthStates,
} from "@/server/tiktok/oauth-state.server";
import { parseTokenPayload, TikTokOAuthError } from "@/server/tiktok/oauth.server";
import { missingScopes } from "@/server/tiktok/creator-api.server";

describe("OAuth Creator — state anti-CSRF", () => {
  beforeEach(() => __resetOAuthStates());

  it("gera state aleatório de 64 hex chars", () => {
    const a = createOAuthState();
    const b = createOAuthState();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  it("aceita state válido apenas uma vez (single-use)", () => {
    const state = createOAuthState();
    expect(consumeOAuthState(state, state)).toBe("ok");
    expect(consumeOAuthState(state, state)).toBe("state_mismatch");
  });

  it("recusa state ausente ou divergente do cookie", () => {
    const state = createOAuthState();
    expect(consumeOAuthState(null, state)).toBe("missing_state");
    expect(consumeOAuthState(state, null)).toBe("missing_state");
    expect(consumeOAuthState(state, "b".repeat(64))).toBe("state_mismatch");
  });

  it("recusa state desconhecido (não emitido pelo servidor)", () => {
    const forged = "c".repeat(64);
    expect(consumeOAuthState(forged, forged)).toBe("state_mismatch");
  });
});

describe("OAuth Creator — resposta de token", () => {
  const base = {
    code: 0,
    data: {
      access_token: "acc",
      refresh_token: "ref",
      open_id: "open-123",
      user_type: 1,
      granted_scopes: ["creator.affiliate.info"],
      access_token_expire_in: 1_800_000_000,
    },
  };

  it("aceita code=0 e user_type=1", () => {
    const result = parseTokenPayload(base);
    expect(result.openId).toBe("open-123");
    expect(result.userType).toBe(1);
    expect(result.grantedScopes).toEqual(["creator.affiliate.info"]);
    expect(result.accessTokenExpiresAt).not.toBeNull();
  });

  it("recusa code diferente de 0", () => {
    expect(() => parseTokenPayload({ ...base, code: 105 })).toThrow(TikTokOAuthError);
  });

  it("recusa identidade que não seja Creator (user_type != 1)", () => {
    expect(() =>
      parseTokenPayload({ code: 0, data: { ...base.data, user_type: 0 } }),
    ).toThrowError(/Creator/);
  });

  it("recusa resposta sem access_token", () => {
    expect(() => parseTokenPayload({ code: 0, data: { user_type: 1 } })).toThrow(
      TikTokOAuthError,
    );
  });
});

describe("Scopes do Creator", () => {
  it("aponta scopes ausentes", () => {
    expect(missingScopes([])).toEqual([
      "creator.affiliate.info",
      "creator.showcase.read",
      "creator.video.write",
    ]);
    expect(
      missingScopes([
        "creator.affiliate.info",
        "creator.showcase.read",
        "creator.video.write",
      ]),
    ).toEqual([]);
  });
});
