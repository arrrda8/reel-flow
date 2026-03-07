"use client";

import { useActionState, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeSlash, SpinnerGap, UserPlus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { register, type RegisterResult } from "@/lib/auth-actions";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [isAutoLogin, startAutoLogin] = useTransition();

  const [state, formAction, isPending] = useActionState(
    async (prevState: RegisterResult | null, formData: FormData) => {
      const result = await register(prevState, formData);

      if (result.success) {
        // Auto-login after successful registration
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        startAutoLogin(async () => {
          const loginResult = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (!loginResult?.error) {
            router.push("/");
            router.refresh();
          } else {
            // Registration succeeded but auto-login failed, redirect to login
            router.push("/login");
          }
        });
      }

      return result;
    },
    null
  );

  const isLoading = isPending || isAutoLogin;
  const passwordStrength = getPasswordStrength(password);

  return (
    <Card className="w-full border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-xl text-foreground">
          Create Account
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Get started with ReelFlow
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-4">
          {state && !state.success && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              disabled={isLoading}
              className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/50"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              autoComplete="email"
              disabled={isLoading}
              className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/50"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={100}
                autoComplete="new-password"
                disabled={isLoading}
                className="border-border bg-muted/50 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeSlash className="h-4 w-4" weight="duotone" />
                ) : (
                  <Eye className="h-4 w-4" weight="duotone" />
                )}
              </button>
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= passwordStrength.level
                          ? passwordStrength.color
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`text-xs ${
                    passwordStrength.level <= 1
                      ? "text-destructive"
                      : passwordStrength.level <= 2
                        ? "text-warning"
                        : "text-success"
                  }`}
                >
                  {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary font-medium text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <SpinnerGap className="h-4 w-4 animate-spin" weight="duotone" />
                {isAutoLogin ? "Signing in..." : "Creating account..."}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" weight="duotone" />
                Sign Up
              </>
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary transition-colors hover:text-primary/80"
          >
            Sign In
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

function getPasswordStrength(password: string): {
  level: number;
  label: string;
  color: string;
} {
  if (password.length === 0)
    return { level: 0, label: "", color: "bg-muted" };
  if (password.length < 8)
    return { level: 1, label: "Too short", color: "bg-destructive" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 2, label: "Weak", color: "bg-warning" };
  if (score <= 3) return { level: 3, label: "Good", color: "bg-success" };
  return { level: 4, label: "Strong", color: "bg-success" };
}
