import {
  DEMO_ARTIST_NAME,
  DEMO_CAMPAIGN_NAME,
  DEMO_DATA_MARKER,
  DEMO_IDS,
  DEMO_SONG_TITLE,
  demoDates,
} from "@/lib/demo-data/constants"
import type { DriveFileRecord, DriveFolderRecord } from "@/lib/types"

const DEMO_FOLDER_URL =
  "https://drive.google.com/drive/folders/demo-prettywise-cotton-candy-skies"

export function buildPrettyWiseDemoDriveFolder(): DriveFolderRecord {
  const { timestamp: ts } = demoDates()
  return {
    id: DEMO_IDS.driveFolder,
    driveFolderId: "demo-prettywise-cotton-candy-skies",
    name: "PrettyWise Cotton Candy Skies Drive Folder",
    url: DEMO_FOLDER_URL,
    campaignId: DEMO_IDS.campaign,
    campaignName: DEMO_CAMPAIGN_NAME,
    artistName: DEMO_ARTIST_NAME,
    songTitle: DEMO_SONG_TITLE,
    productName: "",
    sourceRecordType: "DriveFolder",
    sourceRecordId: DEMO_IDS.driveFolder,
    externalLinkId: DEMO_IDS.extLinkDrive,
    status: "Active",
    lastSyncedAt: ts,
    notes: DEMO_DATA_MARKER,
    tags: ["prettywise", "demo", "google-drive"],
    rawJson: JSON.stringify({ marker: DEMO_DATA_MARKER }),
    createdAt: ts,
    updatedAt: ts,
  }
}

function demoFile(
  id: string,
  driveFileId: string,
  name: string,
  mimeType: string,
  detectedAssetType: string,
  assetId: string,
  webViewLink: string,
): DriveFileRecord {
  const { timestamp: ts } = demoDates()
  return {
    id,
    driveFileId,
    name,
    mimeType,
    url: webViewLink,
    webViewLink,
    thumbnailLink: "",
    iconLink: "",
    sizeBytes: null,
    modifiedTime: ts,
    folderId: DEMO_IDS.driveFolder,
    driveFolderId: "demo-prettywise-cotton-candy-skies",
    campaignId: DEMO_IDS.campaign,
    campaignName: DEMO_CAMPAIGN_NAME,
    artistName: DEMO_ARTIST_NAME,
    songTitle: DEMO_SONG_TITLE,
    productName: "",
    assetId,
    sourceRecordType: "DriveFile",
    sourceRecordId: id,
    detectedAssetType,
    status: "Active",
    lastSyncedAt: ts,
    notes: DEMO_DATA_MARKER,
    tags: ["prettywise", "demo", "google-drive"],
    rawJson: JSON.stringify({ marker: DEMO_DATA_MARKER }),
    createdAt: ts,
    updatedAt: ts,
  }
}

export function buildPrettyWiseDemoDriveFiles(): DriveFileRecord[] {
  return [
    demoFile(
      DEMO_IDS.driveFileThumbnail,
      "demo-pw-thumbnail-png",
      "cotton-candy-skies-youtube-thumbnail.png",
      "image/png",
      "YouTube Thumbnail",
      DEMO_IDS.assetThumbnail,
      "https://drive.google.com/file/d/demo-pw-thumbnail-png/view",
    ),
    demoFile(
      DEMO_IDS.driveFileVideo,
      "demo-pw-video-mp4",
      "cotton-candy-skies-music-video.mp4",
      "video/mp4",
      "Video File",
      "",
      "https://drive.google.com/file/d/demo-pw-video-mp4/view",
    ),
    demoFile(
      DEMO_IDS.driveFileMockup,
      "demo-pw-shirt-mockup-png",
      "prettywise-shirt-mockup.png",
      "image/png",
      "Merch Mockup",
      DEMO_IDS.assetMockup,
      "https://drive.google.com/file/d/demo-pw-shirt-mockup-png/view",
    ),
    demoFile(
      DEMO_IDS.driveFileSocial,
      "demo-pw-social-png",
      "cotton-candy-skies-social-graphic.png",
      "image/png",
      "Social Graphic",
      "",
      "https://drive.google.com/file/d/demo-pw-social-png/view",
    ),
  ]
}
