// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const remove = vi.fn();
const send = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    contacts = { remove };
    emails = { send };
  },
}));

describe("removeContactByEmail", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    remove.mockReset();
    send.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("is a no-op when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.RESEND_AUDIENCE_ID = "aud_123";
    const { removeContactByEmail } = await import("@/lib/email/resend");
    await removeContactByEmail("user@example.com");
    expect(remove).not.toHaveBeenCalled();
  });

  it("is a no-op when RESEND_AUDIENCE_ID is unset", async () => {
    process.env.RESEND_API_KEY = "re_test";
    delete process.env.RESEND_AUDIENCE_ID;
    const { removeContactByEmail } = await import("@/lib/email/resend");
    await removeContactByEmail("user@example.com");
    expect(remove).not.toHaveBeenCalled();
  });

  it("calls Resend contacts.remove when both are set", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_AUDIENCE_ID = "aud_123";
    remove.mockResolvedValue({ data: null, error: null });
    const { removeContactByEmail } = await import("@/lib/email/resend");
    await removeContactByEmail("user@example.com");
    expect(remove).toHaveBeenCalledWith({
      email: "user@example.com",
      audienceId: "aud_123",
    });
  });

  it("swallows errors so account deletion is never blocked", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_AUDIENCE_ID = "aud_123";
    remove.mockRejectedValue(new Error("resend down"));
    const { removeContactByEmail } = await import("@/lib/email/resend");
    await expect(removeContactByEmail("user@example.com")).resolves.toBeUndefined();
  });
});
