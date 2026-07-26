"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";

const today = new Date().toISOString().slice(0, 10);

export function IntakeForm({ astrologerId, specialty }: { astrologerId: number; specialty: string }) {
  const router = useRouter();
  const isMarriageMatching = specialty === "Marriage Matching";

  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [pob, setPob] = useState("");
  const [question, setQuestion] = useState("");

  const [partnerName, setPartnerName] = useState("");
  const [partnerDob, setPartnerDob] = useState("");
  const [partnerTob, setPartnerTob] = useState("");
  const [partnerPob, setPartnerPob] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    dob && tob && pob && question.trim() &&
    (!isMarriageMatching || (partnerName && partnerDob && partnerTob && partnerPob));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          astrologerId,
          gender,
          dob,
          tob,
          pob,
          question,
          ...(isMarriageMatching ? { partnerName, partnerDob, partnerTob, partnerPob } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }
      router.push(`/session/${data.session.id}`);
    } catch {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }

  if (isSubmitting) {
    return (
      <Card className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="animate-pulse text-5xl">🔮</span>
        <p className="text-lg font-bold text-saffron">Consulting the Heavens...</p>
        <p className="text-xs text-clay">
          Calibrating your chart and generating a personalized reading. This can take up to a minute.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter Consultation Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Gender</Label>
            <ChipSelect
              value={gender}
              onChange={setGender}
              options={[
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" },
              ]}
            />
          </div>

          <div>
            <Label htmlFor="dob">Date of Birth</Label>
            <Input id="dob" type="date" max={today} required value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="tob">Time of Birth</Label>
            <Input id="tob" type="time" required value={tob} onChange={(e) => setTob(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="pob">Place of Birth (City, State/Country)</Label>
            <Input
              id="pob"
              required
              value={pob}
              onChange={(e) => setPob(e.target.value)}
              placeholder="e.g. Jaipur, Rajasthan"
            />
          </div>

          <div>
            <Label htmlFor="question">What would you like to ask the stars?</Label>
            <Textarea
              id="question"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Share your question..."
            />
          </div>

          {isMarriageMatching && (
            <div className="space-y-4 rounded-xl border border-rust/25 bg-paper/60 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-rust">
                💑 Partner&apos;s Birth Details
              </p>
              <div>
                <Label htmlFor="partnerName">Partner&apos;s Name</Label>
                <Input id="partnerName" required value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="partnerDob">Partner&apos;s Date of Birth</Label>
                <Input
                  id="partnerDob"
                  type="date"
                  max={today}
                  required
                  value={partnerDob}
                  onChange={(e) => setPartnerDob(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="partnerTob">Partner&apos;s Time of Birth</Label>
                <Input id="partnerTob" type="time" required value={partnerTob} onChange={(e) => setPartnerTob(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="partnerPob">Partner&apos;s Place of Birth</Label>
                <Input id="partnerPob" required value={partnerPob} onChange={(e) => setPartnerPob(e.target.value)} />
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={!canSubmit || isSubmitting}>
            Consult Now
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
