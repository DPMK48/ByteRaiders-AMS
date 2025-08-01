import { useState, useEffect } from "react";
import { useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import {
  QrCode,
  MapPin,
  CheckCircle,
  XCircle,
  LogOut,
  Camera,
  User,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { ThemeToggle } from "./ThemeToggle";
import { Html5Qrcode } from "html5-qrcode";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface AttendanceRecord {
  id: string;
  userId: string;
  checkIn?: Date;
  checkOut?: Date;
  location: string;
  date: string;
}

export function QRScanner() {
  const { user, logout } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<
    "none" | "checked-in" | "checked-out"
  >("none");
  const [message, setMessage] = useState("");
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const qrScannerRef = useRef<HTMLDivElement | null>(null);

  const HUB_LOCATION = { lat: 6.5243793, lng: 3.3792057 }; // Updated hub location
  const LOCATION_RADIUS = 100; // meters

  // 🔁 Fetch and store location ONCE
  useEffect(() => {
    if (!user?.id) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;

          // Store location in state (but do NOT mark attendance here)
          setLocation({ lat: currentLat, lng: currentLng });
        },
        (error) => {
          console.error("Location error:", error);
          setMessage("❌ Location access required for attendance");
        }
      );
    }
  }, [user?.id]);

  // useEffect for setting up the scanner

  // Handle scan initiation
  const handleScan = () => {
    if (attendanceStatus === "checked-in") {
      // Show confirmation modal if already checked in
      setShowCheckoutDialog(true);
      return;
    }

    // Otherwise begin scan immediately
    startScanner();
  };

  // Confirm checkout after dialog
  const confirmCheckout = () => {
    setShowCheckoutDialog(false);
    startScanner();
  };

  // Scanner setup
  const startScanner = () => {
    if (isScanning || !location) return;

    if (!isWithinOfficeLocation()) {
      setMessage("❌ You must be at the hub location to mark attendance");
      return;
    }

    setIsScanning(true);
    setMessage("");
  };

  useEffect(() => {
    let scanner: Html5Qrcode;
    let hasScanned = false;

    if (isScanning && qrScannerRef.current) {
      const scannerId = "qr-scanner-div";
      qrScannerRef.current.id ||= scannerId;
      scanner = new Html5Qrcode(scannerId);

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          async (decodedText) => {
            if (hasScanned) return;
            hasScanned = true;

            if (decodedText !== "HUB-ATTENDANCE-2025") {
              setMessage("❌ Invalid QR code scanned");
              stopScanner(scanner);
              return;
            }

            await scanAndSubmitAttendance(decodedText, scanner);
          },
          (errorMessage) => {
            if (!errorMessage.includes("NotFoundException")) {
              console.warn("QR error:", errorMessage);
            }
          }
        )
        .then(() => setScannerRunning(true))
        .catch((err) => {
          console.error("QR scanner failed:", err);
          setIsScanning(false);
        });
    }

    return () => {
      if (scanner && scannerRunning) stopScanner(scanner);
    };
  }, [isScanning, location]);

  // Stops and clears scanner
  const stopScanner = (scanner: Html5Qrcode) => {
    scanner
      .stop()
      .then(() => {
        scanner.clear();
        setIsScanning(false);
        setScannerRunning(false);
      })
      .catch((err) => console.error("Failed to stop scanner:", err));
  };

  // Handles fetch to backend
  const scanAndSubmitAttendance = async (
    decodedText: string,
    scanner: Html5Qrcode
  ) => {
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("nascomsoft-token")}`,
        },
        body: JSON.stringify({
          location,
          qrCodeContent: decodedText,
        }),
      });

      const data = await res.json();

      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      if (res.ok) {
        setTodayRecord(data);

        if (data.checkOutTime) {
          setAttendanceStatus("checked-out");
          setMessage(`✅ Checked out successfully at ${timeString}`);
        } else if (data.checkInTime) {
          setAttendanceStatus("checked-in");
          setMessage(`✅ Checked in successfully at ${timeString}`);
        } else {
          setAttendanceStatus("none");
          setMessage("❌ Attendance data incomplete");
        }

        updateLocalRecord(data, now);
      } else {
        setAttendanceStatus("none");
        setMessage(data.message || "❌ Attendance error");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setMessage("❌ Error sending attendance");
    }

    stopScanner(scanner);
  };

  // LocalStorage updater
  const updateLocalRecord = (data: any, time: Date) => {
    const today = time.toDateString();
    const storedRecords: AttendanceRecord[] = JSON.parse(
      localStorage.getItem("attendance-records") || "[]"
    );

    if (!user) return;

    const existingIndex = storedRecords.findIndex(
      (record) => record.userId === user.id && record.date === today
    );

    if (data.checkInTime && existingIndex === -1) {
      storedRecords.push({
        id: Date.now().toString(),
        userId: user.id,
        checkIn: new Date(data.checkInTime),
        location: "Nascomsoft Office",
        date: today,
      });
    }

    if (data.checkOutTime && existingIndex !== -1) {
      storedRecords[existingIndex].checkOut = new Date(data.checkOutTime);
    }

    localStorage.setItem("attendance-records", JSON.stringify(storedRecords));
  };

  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ) => {
    const R = 6371e3; // Radius of Earth in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // distance in meters
  };

  const isWithinOfficeLocation = () => {
    if (!location) return false;
    const distance = calculateDistance(
      location.lat,
      location.lng,
      HUB_LOCATION.lat,
      HUB_LOCATION.lng
    );
    return distance <= LOCATION_RADIUS;
  };

  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Header */}
      <div className="bg-card border-b border-card-border">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground">
                Mark Attendance
              </h1>
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground-muted">
                  Welcome, {user?.name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Status Card */}
        <Card className="card-clean">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-primary" />
              Attendance Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground-muted">Today's Status:</span>
              <Badge
                variant={
                  attendanceStatus === "checked-out"
                    ? "default"
                    : attendanceStatus === "checked-in"
                    ? "secondary"
                    : "outline"
                }
                className={
                  attendanceStatus === "checked-out"
                    ? "status-success"
                    : attendanceStatus === "checked-in"
                    ? "bg-primary-light text-primary border-primary"
                    : "status-error"
                }
              >
                {attendanceStatus === "checked-out" && (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                {attendanceStatus === "checked-in" && (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                {attendanceStatus === "none" && (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {attendanceStatus === "checked-out"
                  ? "Completed"
                  : attendanceStatus === "checked-in"
                  ? "Checked In"
                  : "Not Marked"}
              </Badge>
            </div>

            {todayRecord?.checkIn && (
              <div className="bg-background-muted rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-foreground-muted">Check-in:</span>
                  <span className="font-medium text-foreground">
                    {new Date(todayRecord.checkIn).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
                {todayRecord.checkOut && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-foreground-muted">Check-out:</span>
                    <span className="font-medium text-foreground">
                      {new Date(todayRecord.checkOut).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        }
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Status */}
        <Card className="card-clean">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-foreground-muted" />
                <span className="text-sm text-foreground-muted">Location:</span>
              </div>
              <Badge
                variant={
                  location && isWithinOfficeLocation()
                    ? "default"
                    : "destructive"
                }
                className={
                  location && isWithinOfficeLocation()
                    ? "status-success"
                    : "status-error"
                }
              >
                {location
                  ? isWithinOfficeLocation()
                    ? "At the Hub"
                    : "Away from the Hub"
                  : "Unknown"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* QR Scanner */}
        <Card className="card-clean">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center justify-center">
              <Camera className="h-5 w-5 text-primary" />
              QR Code Scanner
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-foreground-muted">
                Scan the QR code at your hub to mark attendance. Ensure location
                is enabled.
              </p>
            </div>

            {/* Message Area */}
            <div className="min-h-[48px] flex items-center justify-center bg-background-muted rounded-lg px-4 py-3 border border-card-border">
              {message ? (
                <div
                  className={`text-sm font-medium text-center ${
                    message.includes("✅")
                      ? "text-success"
                      : message.includes("❌") ||
                        message.includes("You have already") ||
                        message.includes("must be at") ||
                        message.includes("enable location")
                      ? "text-destructive"
                      : "text-foreground-muted"
                  }`}
                >
                  {message}
                </div>
              ) : (
                <div className="text-sm text-foreground-muted text-center">
                  {attendanceStatus === "none" && "Ready to scan for check-in"}
                  {attendanceStatus === "checked-in" &&
                    "Ready to scan for check-out"}
                  {attendanceStatus === "checked-out" &&
                    "✅ Attendance completed for today"}
                </div>
              )}
            </div>

            {/* QR Scanner Area */}
            <div className="relative aspect-square max-w-64 mx-auto bg-background-muted rounded-xl border-2 border-dashed border-card-border flex items-center justify-center">
              {isScanning ? (
                <div className="flex justify-center">
                  <div ref={qrScannerRef} className="w-full max-w-sm" />
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <QrCode className="h-16 w-16 mx-auto text-foreground-muted" />
                  <p className="text-sm text-foreground-muted">
                    Camera viewfinder
                  </p>
                </div>
              )}
            </div>

            {/* Start Scan Button */}
            <Button
              onClick={handleScan}
              disabled={
                isScanning ||
                !location ||
                !isWithinOfficeLocation() ||
                attendanceStatus === "checked-out"
              }
              className="w-full h-12 button-primary"
              size="lg"
            >
              {isScanning ? (
                <>
                  <Camera className="h-4 w-4 mr-2 loading-pulse" />
                  Scanning...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Start Scan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Checkout Confirmation Dialog */}
      <AlertDialog
        open={showCheckoutDialog}
        onOpenChange={setShowCheckoutDialog}
      >
        <AlertDialogContent className="card-clean">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Check-out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to check out? This will mark the end of your
              workday.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCheckout}
              className="button-primary"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Check Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
