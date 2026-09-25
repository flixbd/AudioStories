import { StoryData } from '../data/stories';

export interface DriveStoryFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
}

const DRIVE_FOLDER_NAME = 'Bengali Classics - Stories (বাংলা অডিও নাটক)';

/**
 * Find or create a dedicated Google Drive folder for the application's stories
 */
export async function getOrCreateStoriesFolder(token: string): Promise<string | null> {
  try {
    // 1. Search for existing folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `mimeType = 'application/vnd.google-apps.folder' and name = '${DRIVE_FOLDER_NAME}' and trashed = false`
    )}&fields=files(id,name)&spaces=drive`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // 2. Create folder if not found
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'বাংলা ক্লাসিক্স স্টোরিটেলার অডিও চিত্রনাট্য ও সংরক্ষিত গল্প',
      }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      return created.id;
    }
  } catch (err) {
    console.warn('Could not create or get folder, saving to root Drive:', err);
  }
  return null;
}

/**
 * Save a complete Bengali screenplay StoryData as JSON in Google Drive
 */
export async function saveStoryJsonToDrive(
  token: string,
  story: StoryData
): Promise<DriveStoryFile> {
  const folderId = await getOrCreateStoriesFolder(token);

  const metadata: any = {
    name: `${story.title} - Bengali Classics Story.json`,
    mimeType: 'application/json',
    description: `বাংলা অডিও ক্লাসিক্স চিত্রনাট্য: ${story.title} (${story.originalAuthor || 'ধ্রুপদী'})`,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const storyJson = JSON.stringify(story, null, 2);

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    storyJson +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error?.message || `গুগল ড্রাইভে সংরক্ষণ ব্যর্থ হয়েছে (${response.status})`);
  }

  return await response.json();
}

/**
 * Export human-readable script text to Google Drive
 */
export async function exportStoryTextToDrive(
  token: string,
  story: StoryData
): Promise<DriveStoryFile> {
  const folderId = await getOrCreateStoriesFolder(token);

  let scriptText = `=================================================================\n`;
  scriptText += `গল্পের শিরোনাম: ${story.title}\n`;
  scriptText += `মূল লেখক: ${story.originalAuthor}\n`;
  scriptText += `শৈলী: ${story.dramatizationStyle}\n`;
  scriptText += `মূল সুর: ${story.theme}\n`;
  scriptText += `আনুমানিক সময়: ${story.durationEst}\n`;
  scriptText += `=================================================================\n\n`;

  scriptText += `[দার্শনিক সূচনা ও উপমা - আবহ: তানপুরা ও ধীর বাঁশির টান]\n`;
  scriptText += `${story.philosophicalOpening}\n\n`;
  scriptText += `-----------------------------------------------------------------\n`;
  scriptText += `চরিত্র পরিচয় ও কণ্ঠের রূপায়ণ:\n`;
  story.characters.forEach((c) => {
    scriptText += `- ${c.name} (${c.role}): ${c.voiceDescription}\n`;
  });
  scriptText += `-----------------------------------------------------------------\n\n`;

  story.acts.forEach((act) => {
    scriptText += `\n=================================================================\n`;
    scriptText += `অধ্যায় ${act.actNumber}: ${act.actTitle}\n`;
    scriptText += `[আবহ ধ্বনি: ${act.sfx} | ব্যাকগ্রাউন্ড স্কোর: ${act.bgm} | কথকের কণ্ঠস্বর: ${act.narratorTone}]\n`;
    scriptText += `=================================================================\n\n`;

    act.scenes.forEach((scene, sIdx) => {
      const sfx = scene.sfxCue ? `  [SFX: ${scene.sfxCue}]` : '';
      scriptText += `${sIdx + 1}. [${scene.speaker} - ${scene.emotion}]${sfx}\n`;
      scriptText += `   "${scene.text}"\n\n`;
    });
  });

  if (story.literaryEpilogue) {
    scriptText += `\n=================================================================\n`;
    scriptText += `[সাহিত্যিক উপসংহার ও মনস্তাত্ত্বিক নির্যাস]\n`;
    scriptText += `${story.literaryEpilogue.analysis}\n\n`;
    scriptText += `স্মরণীয় পঙ্‌ক্তি:\n"${story.literaryEpilogue.quote}"\n`;
    scriptText += `=================================================================\n`;
  }

  const metadata: any = {
    name: `${story.title} - পূর্ণাঙ্গ অডিও চিত্রনাট্য.txt`,
    mimeType: 'text/plain',
    description: `বাংলা অডিও ক্লাসিক্স চিত্রনাট্য টেক্সট ফাইল: ${story.title}`,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
    scriptText +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error?.message || `ড্রাইভে চিত্রনাট্য সংরক্ষণ ব্যর্থ হয়েছে (${response.status})`);
  }

  return await response.json();
}

/**
 * List files in the application's folder or all story files in Google Drive
 */
export async function listDriveStories(token: string): Promise<DriveStoryFile[]> {
  try {
    const folderId = await getOrCreateStoriesFolder(token);

    let query = `trashed = false and (mimeType = 'application/json' or mimeType = 'text/plain' or name contains 'Bengali Classics' or name contains '.json')`;
    if (folderId) {
      query = `'${folderId}' in parents and trashed = false`;
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&orderBy=modifiedTime desc&pageSize=50&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`ফাইল তালিকা সংগ্রহ ব্যর্থ হয়েছে (${response.status})`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (err: any) {
    console.error('Failed to list files from Google Drive:', err);
    throw err;
  }
}

/**
 * Load and parse a StoryData JSON file directly from Google Drive
 */
export async function loadStoryFromDrive(token: string, fileId: string): Promise<StoryData> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`গুগল ড্রাইভ থেকে গল্প ডাউনলোড ব্যর্থ হয়েছে (${response.status})`);
  }

  const rawJson = await response.json();

  // Validate story structure
  if (!rawJson.title || !Array.isArray(rawJson.acts)) {
    throw new Error('ফাইলের গঠন একটি বৈধ বাংলা গল্প বা চিত্রনাট্যের সাথে মিলছে না।');
  }

  // Ensure default fields if missing
  const validatedStory: StoryData = {
    id: rawJson.id || `drive-${fileId.slice(0, 8)}`,
    title: rawJson.title,
    subtitle: rawJson.subtitle || 'গুগল ড্রাইভ থেকে লোড করা গল্প',
    originalAuthor: rawJson.originalAuthor || 'অজ্ঞাত',
    dramatizationStyle: rawJson.dramatizationStyle || 'Bengali Classics Solo Narration',
    theme: rawJson.theme || 'ক্লাসিক্যাল গল্প',
    durationEst: rawJson.durationEst || '১৫ মিনিট',
    heroImage: rawJson.heroImage || '/src/assets/images/storyteller_studio_1790306569050.jpg',
    characters: rawJson.characters || [
      {
        name: 'কথক',
        role: 'গল্পকথক',
        voiceDescription: 'গম্ভীর ও প্রজ্ঞাপূর্ণ কণ্ঠ',
        characterKey: 'narrator',
      },
    ],
    acts: rawJson.acts,
    philosophicalOpening: rawJson.philosophicalOpening || '',
    literaryEpilogue: rawJson.literaryEpilogue || {
      analysis: 'গল্পটি গুগল ড্রাইভ থেকে সফলভাবে লোড করা হয়েছে।',
      quote: '',
    },
  };

  return validatedStory;
}

/**
 * Delete a file from Google Drive
 * MANDATORY: Call this ONLY after explicit user confirmation in UI!
 */
export async function deleteDriveFile(token: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok && response.status !== 204) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error?.message || `ফাইল মুছে ফেলা সম্ভব হয়নি (${response.status})`);
  }
}
