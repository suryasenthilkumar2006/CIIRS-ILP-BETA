"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function RegisterPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"supplier" | "startup">("supplier");
    const [organizationName, setOrganizationName] = useState("");
    const [organizationType, setOrganizationType] = useState<string>("temple");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Client-side validation
        if (
            !name.trim() ||
            !email.trim() ||
            !password ||
            !role ||
            !organizationName.trim() ||
            !organizationType ||
            !phone.trim() ||
            !address.trim()
        ) {
            setError("Please fill out all required fields.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Send registration payload to API
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.toLowerCase().trim(),
                    password,
                    role,
                    organizationName: organizationName.trim(),
                    organizationType,
                    phone: phone.trim(),
                    address: address.trim(),
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.message || data.error || "Registration failed. Please try again.");
                setIsLoading(false);
                return;
            }

            // 2. Automatically authenticate the user via NextAuth
            const signInRes = await signIn("credentials", {
                redirect: false,
                email: email.toLowerCase().trim(),
                password,
            });

            if (signInRes?.error) {
                // If auto-signin fails, redirect to login page
                router.push("/login?registered=true");
            } else {
                // 3. Redirect to dashboard
                router.push("/dashboard");
            }
        } catch (err: any) {
            console.error("Registration error:", err);
            setError(err.message || "An unexpected network error occurred.");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-black/95 p-4 py-8">
            <Card className="w-full max-w-lg border-zinc-800 bg-zinc-950/50 backdrop-blur-xl">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">
                        Create an account
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                        Join CIIRS as a waste supplier or circular valorization startup
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name & Email */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label
                                    htmlFor="name"
                                    className="text-sm font-medium leading-none text-zinc-300"
                                >
                                    Full Name *
                                </label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Jane Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-700"
                                />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="text-sm font-medium leading-none text-zinc-300"
                                >
                                    Email Address *
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="jane@organization.org"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-700"
                                />
                            </div>
                        </div>

                        {/* Account Role & Organization Type */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label
                                    htmlFor="role"
                                    className="text-sm font-medium leading-none text-zinc-300"
                                >
                                    Account Role *
                                </label>
                                <Select
                                    value={role}
                                    onValueChange={(val: "supplier" | "startup") => {
                                        setRole(val);
                                        if (val === "startup") {
                                            setOrganizationType("startup");
                                        } else if (organizationType === "startup") {
                                            setOrganizationType("temple");
                                        }
                                    }}
                                >
                                    <SelectTrigger
                                        id="role"
                                        className="bg-zinc-900/50 border-zinc-800 text-zinc-100 focus:ring-zinc-700"
                                    >
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                                        <SelectItem value="supplier">Waste Supplier (Generator)</SelectItem>
                                        <SelectItem value="startup">Valorization Startup (Buyer)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="organizationType"
                                    className="text-sm font-medium leading-none text-zinc-300"
                                >
                                    Organization Type *
                                </label>
                                <Select
                                    value={organizationType}
                                    onValueChange={(val) => setOrganizationType(val)}
                                >
                                    <SelectTrigger
                                        id="organizationType"
                                        className="bg-zinc-900/50 border-zinc-800 text-zinc-100 focus:ring-zinc-700"
                                    >
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                                        {role === "supplier" ? (
                                            <>
                                                <SelectItem value="temple">Temple / Religious Institution</SelectItem>
                                                <SelectItem value="apartment">Apartment / Residential Society</SelectItem>
                                                <SelectItem value="restaurant">Restaurant / Commercial Kitchen</SelectItem>
                                                <SelectItem value="factory">Factory / Industrial Facility</SelectItem>
                                            </>
                                        ) : (
                                            <>
                                                <SelectItem value="startup">Circular Economy Startup</SelectItem>
                                                <SelectItem value="factory">Recycling / Processing Plant</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Organization Name & Phone */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label
                                    htmlFor="organizationName"
                                    className="text-sm font-medium leading-none text-zinc-300"
                                >
                                    Organization Name *
                                </label>
                                <Input
                                    id="organizationName"
                                    type="text"
                                    placeholder="e.g. Sri Meenakshi Temple, EcoPlast Labs"
                                    value={organizationName}
                                    onChange={(e) => setOrganizationName(e.target.value)}
                                    required
                                    className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-700"
                                />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="phone"
                                    className="text-sm font-medium leading-none text-zinc-300"
                                >
                                    Phone Number *
                                </label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="+91 98765 43210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-700"
                                />
                            </div>
                        </div>

                        {/* Physical Address */}
                        <div className="space-y-2">
                            <label
                                htmlFor="address"
                                className="text-sm font-medium leading-none text-zinc-300"
                            >
                                Facility / Pickup Address *
                            </label>
                            <Input
                                id="address"
                                type="text"
                                placeholder="123 Industrial Estate, Anna Nagar, Chennai"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                required
                                className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-700"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label
                                htmlFor="password"
                                className="text-sm font-medium leading-none text-zinc-300"
                            >
                                Password (min. 6 characters) *
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-700"
                            />
                        </div>

                        {error && (
                            <p className="text-sm font-medium text-red-500 text-center rounded-md bg-red-500/10 border border-red-500/20 p-2">
                                {error}
                            </p>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-300 transition-colors font-medium mt-2"
                            disabled={isLoading}
                        >
                            {isLoading ? "Creating account..." : "Create Account"}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                    <div className="text-center text-sm text-zinc-400">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="font-medium text-zinc-100 hover:text-zinc-50 hover:underline transition-colors"
                        >
                            Log in
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
