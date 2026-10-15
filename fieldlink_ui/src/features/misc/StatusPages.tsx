import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        icon={<SearchX className="h-7 w-7" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or may have been moved."
        action={
          <div className="flex gap-3">
            <Link to="/"><Button variant="outline">Go home</Button></Link>
            <Link to="/opportunities"><Button>Browse opportunities</Button></Link>
          </div>
        }
      />
    </div>
  );
}

export function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        title="Access restricted"
        description="Your account role doesn't have access to this page. You'll be redirected to your dashboard."
        action={<Link to="/"><Button variant="outline">Go home</Button></Link>}
      />
    </div>
  );
}
