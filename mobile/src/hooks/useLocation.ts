import { useEffect, useState } from "react";
import { Platform, Alert, Linking } from "react-native";
import * as Location from "expo-location";

export interface Coords {
  latitude: number;
  longitude: number;
}

export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS === "web") {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser");
        setLoading(false);
        Alert.alert("Location Not Supported", "Your browser does not support geolocation.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          setLoading(false);
        },
        () => {
          setError("Location permission denied");
          setLoading(false);
          Alert.alert(
            "Location Required",
            "Hungr needs your location to find nearby restaurants. Please enable location access in your browser settings and refresh the page."
          );
        }
      );
      return;
    }

    (async () => {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        setLoading(false);

        // If permission was permanently denied, prompt the user to open Settings
        if (!canAskAgain) {
          Alert.alert(
            "Location Required",
            "Hungr needs your location to find nearby restaurants. Please enable it in Settings.",
            [
              { text: "Not Now", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
        }
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLoading(false);
    })();
  }, []);

  return { coords, error, loading };
}
