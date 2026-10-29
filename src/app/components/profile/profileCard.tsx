import { OwnProfile } from "@/app/types";
import AvailabilityPrivacyToggle from "@/app/components/profile/availabilityPrivacyToggle";
import InstallAppSetting from "@/app/components/profile/installAppSetting";
import LearntSongsPrivacyToggle from "@/app/components/profile/learntSongsPrivacyToggle";
import MusicAppSettings from "@/app/components/profile/musicAppSettings";
import NotificationSettings from "@/app/components/profile/notificationSettings";
import ProfileIdentity from "@/app/components/profile/profileIdentity";

export default function ProfileCard({ profile }: { profile: OwnProfile }) {
  return (
    <div className="card">
      <ProfileIdentity profile={profile} />
      <h3 className="settings-title">Settings</h3>
      <div className="settings-list">
        <AvailabilityPrivacyToggle />
        <LearntSongsPrivacyToggle />
        <MusicAppSettings />
        <NotificationSettings />
        <InstallAppSetting />
      </div>
    </div>
  );
}
