import { useDropzone } from "react-dropzone";
import { FaRegImage } from "react-icons/fa6";
import { Button } from "@/src/components/ui/button";
import { Label } from "@/src/components/ui/label";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";

/**
 * Icon/banner picker used by the community forms. Uploading is left to the
 * caller, since create and edit upload differently (lemmy-ui uses the
 * generic image endpoint on create and /community/icon|banner on edit).
 */
export function ImageDropzone({
  id,
  label,
  url,
  pending,
  onDrop,
  onRemove,
  imgClassName,
}: {
  id: string;
  label: string;
  url: string | null | undefined;
  pending: boolean;
  onDrop: (file: File) => void;
  onRemove: () => void;
  imgClassName?: string;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [],
      "video/*": [],
    },
    onDrop: (files) => {
      if (files[0]) {
        onDrop(files[0]);
      }
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div
        {...getRootProps()}
        className="border-2 border-dashed flex flex-col items-center justify-center gap-2 p-2 cursor-pointer rounded-md min-h-32"
      >
        <input id={id} {...getInputProps()} />
        {url && !pending && (
          <img src={url} className={cn("object-cover", imgClassName)} />
        )}
        {pending && (
          <Skeleton
            className={cn("flex items-center justify-center", imgClassName)}
          >
            <FaRegImage className="text-muted-foreground text-4xl" />
          </Skeleton>
        )}
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p className="text-muted-foreground">
            Drop or upload image here
            {url && " to replace"}
          </p>
        )}
      </div>
      {url && (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={onRemove}
        >
          Remove {label.toLowerCase()}
        </Button>
      )}
    </div>
  );
}
