"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "#/server/convex/_generated/api";
import { useState, useEffect } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";
import { Separator } from "#/components/ui/separator";
import { Loader2, Check, GitBranch, Bell, BellOff, Mail, Smartphone } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { subscribeToPush, isPushSupported, getPushPermissionState } from "#/lib/push";
import { Badge } from "#/components/ui/badge";

export default function SettingsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const settings = useQuery(api.settings.get, isLoaded && isSignedIn ? {} : "skip");
  const updateSettings = useMutation(api.settings.update);
  const ensureSettings = useMutation(api.settings.ensureSettings);
  const testPush = useAction(api.notifications.testPush);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushStatus, setPushStatus] = useState<string>("checking...");
  const [testingPush, setTestingPush] = useState(false);
  const [pushTestResult, setPushTestResult] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [dailyCatchup, setDailyCatchup] = useState(true);
  const [reminderEmail, setReminderEmail] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    ensureSettings({});
  }, [ensureSettings]);

  useEffect(() => {
    if (settings) {
      setEmail(settings.email);
      setDailyCatchup(settings.dailyCatchupEnabled);
      setReminderEmail(settings.reminderEmailEnabled);
      setPushEnabled(settings.pushEnabled);
    }
  }, [settings]);

  useEffect(() => {
    async function checkPush() {
      if (!isPushSupported()) {
        setPushStatus("not supported");
        return;
      }
      const perm = await getPushPermissionState();
      setPushStatus(perm);
    }
    checkPush();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        email,
        dailyCatchupEnabled: dailyCatchup,
        reminderEmailEnabled: reminderEmail,
        pushEnabled: pushEnabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleEnablePush = async () => {
    const sub = await subscribeToPush();
    if (sub) {
      await updateSettings({
        pushEnabled: true,
        pushSubscription: JSON.stringify(sub),
      });
      setPushEnabled(true);
      setPushStatus("granted");
    }
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    setPushTestResult(null);
    try {
      await testPush({});
      setPushTestResult("Push sent! Check your notifications.");
    } catch (e) {
      setPushTestResult(e instanceof Error ? e.message : "Failed to send push");
    } finally {
      setTestingPush(false);
    }
  };

  if (settings === undefined) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="h-40 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure your RemindMe preferences.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Notifications</h2>
        <div className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="email">Notification Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
            <p className="text-xs text-muted-foreground">
              Where to send daily catchup and reminder emails.
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Daily Catchup</Label>
              <p className="text-xs text-muted-foreground">
                Receive a daily summary at 7am UTC.
              </p>
            </div>
            <Switch
              checked={dailyCatchup}
              onCheckedChange={setDailyCatchup}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Reminder Emails</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when reminders are due.
              </p>
            </div>
            <Switch
              checked={reminderEmail}
              onCheckedChange={setReminderEmail}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Label>Push Notifications</Label>
                <Badge variant={pushStatus === "granted" ? "default" : pushStatus === "denied" ? "destructive" : "secondary"} className="text-[10px]">
                  {pushStatus}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Browser push for reminders and catchup.
              </p>
            </div>
            {pushEnabled ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestPush}
                  disabled={testingPush}
                >
                  {testingPush ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Bell className="h-3.5 w-3.5 mr-1" />
                  )}
                  Test
                </Button>
                <Switch
                  checked={true}
                  onCheckedChange={async () => {
                    await updateSettings({ pushEnabled: false, pushSubscription: undefined });
                    setPushEnabled(false);
                  }}
                />
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnablePush}
                disabled={!isPushSupported()}
              >
                <Smartphone className="h-3.5 w-3.5 mr-1" />
                Enable Push
              </Button>
            )}
          </div>
          {pushTestResult && (
            <p className="text-xs text-muted-foreground">{pushTestResult}</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">GitHub</h2>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <GitBranch className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Connected via Clerk</p>
              <p className="text-xs text-muted-foreground">
                Your GitHub account is connected through your Clerk login.
                Re-authorize in your Clerk account settings if needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Appearance</h2>
        <div className="rounded-lg border p-4">
          <Label>Default Note Color</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Choose the default color for new notes.
          </p>
          <div className="flex gap-2">
            {[
              "#fbbf24", "#f472b6", "#a78bfa", "#34d399", "#60a5fa",
              "#fb923c", "#f87171", "#2dd4bf", "#c084fc", "#facc15",
            ].map((color) => (
              <button
                key={color}
                className="w-8 h-8 rounded-full transition-transform hover:scale-110 border-2 border-transparent data-[active=true]:border-foreground"
                style={{ backgroundColor: color }}
                data-active={settings?.defaultNoteColor === color}
                onClick={() => updateSettings({ defaultNoteColor: color })}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : saved ? (
            <Check className="h-4 w-4 mr-2" />
          ) : null}
          {saved ? "Saved" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
