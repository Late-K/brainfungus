import { OwnProfile } from "@/app/types";
import InstallAppSetting from "@/app/components/profile/installAppSetting";
import ProfileIdentity from "@/app/components/profile/profileIdentity";
import SettingsMenu from "@/app/components/profile/settingsMenu";

export default function ProfileCard({ profile }: { profile: OwnProfile }) {
  return (
    <div className="card">
      <ProfileIdentity profile={profile} actions={<SettingsMenu />} />
      <InstallAppSetting />
    </div>
  );
}
