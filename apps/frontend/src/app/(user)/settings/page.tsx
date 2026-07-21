import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { StripedPattern } from "@/components/ui/striped-pattern";
import { getUsageStatsQuery } from "@/lib/queries/getUsageStatsQuery";
import { getServerUserSession } from "@/lib/serverAction";
import { Laptop, Shield, Smartphone, Tablet } from "lucide-react";

const getDeviceMeta = (userAgent?: string | null) => {
  if (!userAgent) {
    return { label: "Unknown device", icon: Shield };
  }

  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("android") || ua.includes("mobi")) {
    return { label: "Mobile device", icon: Smartphone };
  }
  if (ua.includes("ipad") || ua.includes("tablet")) {
    return { label: "Tablet", icon: Tablet };
  }

  return { label: "Desktop device", icon: Laptop };
};

export default async function SettingsPage() {
  const session = await getServerUserSession();
  const usageStats = await getUsageStatsQuery();
  const user = session?.user;
  const activeSession = session?.session;

  const deviceMeta = getDeviceMeta(activeSession?.userAgent);
  const DeviceIcon = deviceMeta.icon;
  const startedAt = activeSession?.createdAt
    ? new Date(activeSession.createdAt).toLocaleString()
    : "Unknown";
  const expiresAt = activeSession?.expiresAt
    ? new Date(activeSession.expiresAt).toLocaleString()
    : "Unknown";
  const ipAddress = activeSession?.ipAddress ?? "Unknown";
  const userAgent = activeSession?.userAgent ?? "User agent unavailable";
  const usageResetAt = usageStats?.resetAt
    ? new Date(usageStats.resetAt).toUTCString()
    : "Unknown";
  const usageCards = usageStats
    ? [
        { title: "Agent Chat", data: usageStats.today.agentChat },
        { title: "Autocomplete", data: usageStats.today.autocomplete },
        { title: "Editor Transform", data: usageStats.today.editorTransform },
      ]
    : [];
  const weeklyMaxTokens = usageStats
    ? Math.max(...usageStats.weekly.map((day) => day.tokens), 1)
    : 1;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
        <div className="relative overflow-hidden rounded-2xl border bg-card">
          <StripedPattern className="text-muted/30" />
          <div className="relative z-20 px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Account
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your profile details and current session.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Basic information tied to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-1 ring-border">
                  <AvatarImage src={user?.image ?? ""} alt={user?.name ?? ""} />
                  <AvatarFallback>
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Profile image</p>
                  <p className="text-xs text-muted-foreground">
                    Synced from your sign-in provider.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    defaultValue={user?.name ?? ""}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email">Email</Label>
                  </div>
                  <Input
                    id="email"
                    defaultValue={user?.email ?? ""}
                    disabled
                    className="disabled:opacity-100 disabled:text-muted-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Session</CardTitle>
              <CardDescription>
                This device is currently signed in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
                <div className="rounded-lg border bg-background p-2">
                  <DeviceIcon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{deviceMeta.label}</p>
                    <Badge
                      variant="secondary"
                      className="rounded-full text-[10px] uppercase tracking-widest"
                    >
                      Current
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground break-words">
                    {userAgent}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">IP address</span>
                  <span className="font-medium">{ipAddress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Signed in</span>
                  <span className="font-medium">{startedAt}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="font-medium">{expiresAt}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Usage</CardTitle>
              <CardDescription>
                Daily usage resets at {usageResetAt} (UTC).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {usageStats ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    {usageCards.map((card) => {
                      const tokenPct = Math.min(
                        (card.data.usedTokens / card.data.dailyTokens) * 100,
                        100,
                      );
                      const requestPct = Math.min(
                        (card.data.usedRequests / card.data.dailyRequests) *
                          100,
                        100,
                      );

                      return (
                        <div
                          key={card.title}
                          className="rounded-xl border bg-muted/20 p-4"
                        >
                          <p className="text-sm font-medium">{card.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Model: {card.data.model}
                          </p>
                          <div className="mt-3 space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Tokens: {card.data.usedTokens} /{" "}
                                {card.data.dailyTokens}
                              </p>
                              <Progress
                                value={tokenPct}
                                className="mt-1 h-1.5"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Requests: {card.data.usedRequests} /{" "}
                                {card.data.dailyRequests}
                              </p>
                              <Progress
                                value={requestPct}
                                className="mt-1 h-1.5"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium">Per-Model Breakdown</p>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-2">Model</th>
                            <th className="pb-2">Tokens</th>
                            <th className="pb-2">Requests</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usageStats.modelBreakdown.map((row) => (
                            <tr
                              key={row.model}
                              className="border-b last:border-0"
                            >
                              <td className="py-2">{row.model}</td>
                              <td className="py-2">
                                {row.usedTokens} / {row.dailyTokens}
                              </td>
                              <td className="py-2">
                                {row.usedRequests} / {row.dailyRequests}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium">7-Day Usage Trend</p>
                    <div className="mt-3 space-y-2">
                      {usageStats.weekly.map((day) => (
                        <div key={day.date} className="rounded-md border p-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{day.date}</span>
                            <span>
                              {day.tokens} tokens • {day.requests} requests
                            </span>
                          </div>
                          <Progress
                            value={Math.min(
                              (day.tokens / weeklyMaxTokens) * 100,
                              100,
                            )}
                            className="mt-2 h-1.5"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium">
                      Per-Chat Usage (Today)
                    </p>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-2">Chat</th>
                            <th className="pb-2">Tokens</th>
                            <th className="pb-2">Requests</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usageStats.perChat.length > 0 ? (
                            usageStats.perChat.map((chat) => (
                              <tr
                                key={chat.chatId}
                                className="border-b last:border-0"
                              >
                                <td className="py-2">{chat.title}</td>
                                <td className="py-2">{chat.tokens}</td>
                                <td className="py-2">{chat.requests}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                className="py-2 text-muted-foreground"
                                colSpan={3}
                              >
                                No agent chat usage recorded today.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sign in to view AI usage details.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
