export interface FileUploadState {
  file: File | null;
  firstIdentification: string | null;
  isUploading: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
}

export interface AppElements {
  clock: HTMLElement;
  date: HTMLElement;
  city: HTMLElement;
  weather: HTMLElement;
  weatherIcon: HTMLElement;
  dropzone: HTMLElement;
  fileInput: HTMLInputElement;
  dropzoneText: HTMLElement;
  excelPreview: HTMLElement;
  uploadButton: HTMLButtonElement;
  statusMessage: HTMLElement;
  inputUser: HTMLInputElement;
  inputPass: HTMLInputElement;
  inputStartDate: HTMLInputElement;
  inputEndDate: HTMLInputElement;
  themeToggle: HTMLButtonElement;
}
