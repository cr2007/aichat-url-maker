import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export function ModeToggle() {
  const { setTheme } = useTheme()
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  )

  useEffect(() => {
    const el = document.documentElement
    const obs = new MutationObserver(() => setIsDark(el.classList.contains("dark")))
    obs.observe(el, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="group">
          <span className="relative flex h-4 w-4 items-center justify-center group-hover:animate-spin-hue">
            <Sun
              className={cn(
                "absolute h-4 w-4 transition-all duration-300 ease-in-out",
                isDark ? "opacity-0 scale-50 rotate-45" : "opacity-100 scale-100 rotate-0"
              )}
            />
            <Moon
              className={cn(
                "absolute h-4 w-4 transition-all duration-300 ease-in-out",
                isDark ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 -rotate-45"
              )}
            />
          </span>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
