import type { LaunchOptions } from "@playwright/test";
export function browserLaunchOptions(): LaunchOptions;
export function browserReady(): Promise<boolean>;
