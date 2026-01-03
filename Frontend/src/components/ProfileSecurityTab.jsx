import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Label } from "./ui/label";
import { Settings } from "lucide-react";

export default function ProfileSecurityTab({
  setIsPasswordModalOpen,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Security Settings
        </CardTitle>
        <CardDescription>
          Manage your password and security settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Change Password</Label>
            <p className="text-sm text-muted-foreground">
              Update your password to keep your account secure
            </p>
            <Button
              variant="outline"
              onClick={() => setIsPasswordModalOpen(true)}
            >
              Change Password
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

