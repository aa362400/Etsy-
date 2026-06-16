/**
 * UploadImages 图片上传组件
 * - 可选上传，最多 maxCount 张
 * - 支持预览、删除
 * - 上传中 loading 状态
 */
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { Loader, X, Plus, ImagePlus } from 'lucide-react-taro';
import { uploadImage } from '@/lib/api';
import './index.css';

interface UploadImagesProps {
  value: string[];
  onChange: (images: string[]) => void;
  maxCount?: number;
  maxSize?: number;
  disabled?: boolean;
}

export default function UploadImages({
  value = [],
  onChange,
  maxCount = 9,
  maxSize = 10,
  disabled = false,
}: UploadImagesProps) {
  const [uploading, setUploading] = useState(false);

  const handleChoose = async () => {
    const remain = maxCount - value.length;
    if (remain <= 0) {
      Taro.showToast({ title: `最多上传${maxCount}张图片`, icon: 'none' });
      return;
    }

    try {
      const res = await Taro.chooseImage({
        count: remain,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      });

      const tempFiles = res.tempFiles || [];
      const selectedPaths = (res.tempFilePaths || []).filter(Boolean);
      const validPaths = selectedPaths.filter((_, index) => {
        const file = tempFiles[index] as any;
        const size = Number(file?.size || 0);
        return !size || size <= maxSize * 1024 * 1024;
      });

      if (validPaths.length < selectedPaths.length) {
        Taro.showToast({ title: `已跳过超过${maxSize}MB的图片`, icon: 'none' });
      }

      if (!validPaths.length) return;

      setUploading(true);
      const uploadedUrls: string[] = [];
      for (const path of validPaths) {
        const uploaded = await uploadImage(path);
        if (uploaded.url) uploadedUrls.push(uploaded.url);
      }

      onChange([...value, ...uploadedUrls].slice(0, maxCount));
    } catch (err: any) {
      if (String(err?.errMsg || '').includes('cancel')) return;
      Taro.showToast({ title: err?.message || '图片上传失败，请稍后重试', icon: 'none' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    onChange(next);
  };

  const handlePreview = (current: string) => {
    Taro.previewImage({ current, urls: value });
  };

  return (
    <View className="upload-images">
      <View className="upload-images-head">
        <View className="upload-images-title">
          <ImagePlus size={18} color="#B87920" />
          <Text className="upload-images-title-text">补充现场图片</Text>
        </View>
        <Text className="upload-images-count">{value.length}/{maxCount}</Text>
      </View>

      <View className="upload-images-grid">
        {value.map((image, index) => (
          <View
            key={`${image}-${index}`}
            className="upload-images-item"
          >
            <Image
              src={image}
              mode="aspectFill"
              className="upload-images-preview"
              onClick={() => handlePreview(image)}
            />
            {!disabled ? (
              <View
                onClick={(e: any) => {
                  e.stopPropagation();
                  handleRemove(index);
                }}
                className="upload-images-remove"
              >
                <X size={17} color="#FFFFFF" />
              </View>
            ) : null}
          </View>
        ))}
        {value.length < maxCount && !disabled ? (
          <View onClick={handleChoose} className="upload-images-add">
            {uploading ? <Loader size={31} color="#B87920" /> : <Plus size={32} color="#B87920" />}
            <Text className="upload-images-add-text">{uploading ? '上传中' : '添加图片'}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
