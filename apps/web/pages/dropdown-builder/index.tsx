import React, { useState } from 'react';

import { Code, Copy, Eye, Plus, Trash2 } from 'lucide-react';

import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';

interface DropdownOption {
  id: string;
  text: string;
  type: 'normal' | 'separator' | 'header';
}

interface DropdownStyles {
  containerWidth: string;
  containerBackgroundColor: string;
  containerTextColor: string;
  containerBorderTopColor: string;
  containerBorderBottomColor: string;
  containerBorderRadius: number;
  containerFontSize: number;
  selectBackgroundColor: string;
  selectTextColor: string;
  selectWidth: number;
  selectBorderRadius: number;
  selectFontSize: number;
  selectMargin: number;
  footerFontSize: number;
}

const defaultStyles: DropdownStyles = {
  containerWidth: '100%',
  containerBackgroundColor: '',
  containerTextColor: '#1C3994',
  containerBorderTopColor: '',
  containerBorderBottomColor: '',
  containerBorderRadius: 8,
  containerFontSize: 16,
  selectBackgroundColor: '#1C3994',
  selectTextColor: '#FFFFFF',
  selectWidth: 400,
  selectBorderRadius: 8,
  selectFontSize: 16,
  selectMargin: 5,
  footerFontSize: 14,
};

const defaultOptions: DropdownOption[] = [
  {
    id: '1',
    text: 'Kim Minjeong - RB1',
    type: 'header',
  },
  { id: '2', text: 'S55 R1.01 - OSK', type: 'normal' },
  {
    id: '3',
    text: '=================================================================',
    type: 'separator',
  },
  {
    id: '4',
    text: 'S54 DSFL Offensive Performance of the Year',
    type: 'normal',
  },
];

export default function DropdownCreator() {
  const [styles, setStyles] = useState<DropdownStyles>(defaultStyles);
  const [options, setOptions] = useState<DropdownOption[]>(defaultOptions);
  const [footerLinks, setFooterLinks] = useState({
    playerId: '5576',
    wikiName: 'Kim_Minjeong',
  });
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copySuccess, setCopySuccess] = useState(false);

  const addOption = () => {
    const newOption: DropdownOption = {
      id: Date.now().toString(),
      text: 'New option',
      type: 'normal',
    };
    setOptions([...options, newOption]);
  };

  const removeOption = (id: string) => {
    setOptions(options.filter((option) => option.id !== id));
  };

  const updateOption = (
    id: string,
    field: keyof DropdownOption,
    value: string,
  ) => {
    setOptions(
      options.map((option) =>
        option.id === id ? { ...option, [field]: value } : option,
      ),
    );
  };

  const generateBBCode = () => {
    // Build container style with optional properties
    const containerStyleParts = [
      `color:${styles.containerTextColor}`,
      `width:${styles.containerWidth}`,
      `border-radius:${styles.containerBorderRadius}px`,
      `font-size: ${styles.containerFontSize}px`,
      `text-align: center`,
      `margin-right: auto`,
      `margin-left: auto`,
    ];

    // Add optional background color
    if (
      styles.containerBackgroundColor &&
      styles.containerBackgroundColor.toLowerCase() !== 'transparent' &&
      styles.containerBackgroundColor.toLowerCase() !== 'none'
    ) {
      containerStyleParts.unshift(
        `background-color:${styles.containerBackgroundColor}`,
      );
    }

    // Add optional border top
    if (
      styles.containerBorderTopColor &&
      styles.containerBorderTopColor.toLowerCase() !== 'transparent' &&
      styles.containerBorderTopColor.toLowerCase() !== 'none'
    ) {
      containerStyleParts.push(
        `border-top: 3px solid ${styles.containerBorderTopColor}`,
      );
    }

    // Add optional border bottom
    if (
      styles.containerBorderBottomColor &&
      styles.containerBorderBottomColor.toLowerCase() !== 'transparent' &&
      styles.containerBorderBottomColor.toLowerCase() !== 'none'
    ) {
      containerStyleParts.push(
        `border-bottom: 3px solid ${styles.containerBorderBottomColor}`,
      );
    }

    const containerStyle = containerStyleParts.join('; ');

    const selectStyle = `background-color: ${styles.selectBackgroundColor};color: ${styles.selectTextColor}; font-family:Arial; font-size: ${styles.selectFontSize}px; width: ${styles.selectWidth}px; border:yes;border-radius: ${styles.selectBorderRadius}px; margin: ${styles.selectMargin}px ${styles.selectMargin}px ${styles.selectMargin}px ${styles.selectMargin}px; text-align: center; margin-top: ${styles.selectMargin}px; margin-bottom: ${styles.selectMargin}px;`;

    let bbCode = `[div style="${containerStyle}"]\n`;
    bbCode += `[SELECT style="${selectStyle}"][br]\n\n`;

    options.forEach((option) => {
      bbCode += `[OPTION]${option.text}[/OPTION]\n`;
    });

    bbCode += `\n[/select]\n`;

    if (footerLinks.playerId || footerLinks.wikiName) {
      const playerUrl = footerLinks.playerId
        ? `https://portal.sim-football.com/player/${footerLinks.playerId}`
        : '';
      const wikiUrl = footerLinks.wikiName
        ? `https://wiki.sim-football.com/view/${footerLinks.wikiName}`
        : '';

      if (playerUrl && wikiUrl) {
        bbCode += `[size=${styles.footerFontSize}px][url=${playerUrl}]Player[/url] | [url=${wikiUrl}]Wiki[/url][/size]`;
      } else if (playerUrl) {
        bbCode += `[size=${styles.footerFontSize}px][url=${playerUrl}]Player[/url][/size]`;
      } else if (wikiUrl) {
        bbCode += `[size=${styles.footerFontSize}px][url=${wikiUrl}]Wiki[/url][/size]`;
      }
    }

    bbCode += `\n[/div]`;

    return bbCode;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateBBCode());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <PageLayout
      title="Forum Dropdown Creator"
      description="Create a custom dropdown for your forum sig"
      maxWidth="7xl"
    >
      <div className="py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Controls */}
            <div className="space-y-6">
              {/* Container Styles */}
              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-xl font-semibold mb-4">Container Styles</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Width
                    </label>
                    <input
                      type="text"
                      value={styles.containerWidth}
                      onChange={(e) =>
                        setStyles({
                          ...styles,
                          containerWidth: e.target.value || '100%',
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      placeholder="100% or 490px"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Font Size (px)
                    </label>
                    <input
                      type="number"
                      value={styles.containerFontSize}
                      onChange={(e) =>
                        setStyles({
                          ...styles,
                          containerFontSize: parseInt(e.target.value) || 14,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        color={styles.containerBackgroundColor}
                        onChange={(color) =>
                          setStyles({
                            ...styles,
                            containerBackgroundColor: color,
                          })
                        }
                      />
                      <input
                        type="text"
                        value={styles.containerBackgroundColor}
                        onChange={(e) =>
                          setStyles({
                            ...styles,
                            containerBackgroundColor: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                        placeholder="Leave empty, 'none', or 'transparent' to remove"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        color={styles.containerTextColor}
                        onChange={(color) =>
                          setStyles({ ...styles, containerTextColor: color })
                        }
                      />
                      <input
                        type="text"
                        value={styles.containerTextColor}
                        onChange={(e) =>
                          setStyles({
                            ...styles,
                            containerTextColor: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Border Top Color
                    </label>
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        color={styles.containerBorderTopColor}
                        onChange={(color) =>
                          setStyles({
                            ...styles,
                            containerBorderTopColor: color,
                          })
                        }
                      />
                      <input
                        type="text"
                        value={styles.containerBorderTopColor}
                        onChange={(e) =>
                          setStyles({
                            ...styles,
                            containerBorderTopColor: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                        placeholder="Leave empty, 'none', or 'transparent' to remove"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Border Bottom Color
                    </label>
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        color={styles.containerBorderBottomColor}
                        onChange={(color) =>
                          setStyles({
                            ...styles,
                            containerBorderBottomColor: color,
                          })
                        }
                      />
                      <input
                        type="text"
                        value={styles.containerBorderBottomColor}
                        onChange={(e) =>
                          setStyles({
                            ...styles,
                            containerBorderBottomColor: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                        placeholder="Leave empty, 'none', or 'transparent' to remove"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Border Radius: {styles.containerBorderRadius}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={styles.containerBorderRadius}
                      onChange={(e) =>
                        setStyles({
                          ...styles,
                          containerBorderRadius: parseInt(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Select Styles */}
              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-xl font-semibold mb-4">Select Styles</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={styles.selectWidth}
                      onChange={(e) =>
                        setStyles({
                          ...styles,
                          selectWidth: parseInt(e.target.value) || 400,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Font Size (px)
                    </label>
                    <input
                      type="number"
                      value={styles.selectFontSize}
                      onChange={(e) =>
                        setStyles({
                          ...styles,
                          selectFontSize: parseInt(e.target.value) || 14,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        color={styles.selectBackgroundColor}
                        onChange={(color) =>
                          setStyles({ ...styles, selectBackgroundColor: color })
                        }
                      />
                      <input
                        type="text"
                        value={styles.selectBackgroundColor}
                        onChange={(e) =>
                          setStyles({
                            ...styles,
                            selectBackgroundColor: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        color={styles.selectTextColor}
                        onChange={(color) =>
                          setStyles({ ...styles, selectTextColor: color })
                        }
                      />
                      <input
                        type="text"
                        value={styles.selectTextColor}
                        onChange={(e) =>
                          setStyles({
                            ...styles,
                            selectTextColor: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Border Radius: {styles.selectBorderRadius}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={styles.selectBorderRadius}
                      onChange={(e) =>
                        setStyles({
                          ...styles,
                          selectBorderRadius: parseInt(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Options Management */}
              <div className="bg-card p-6 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Dropdown Options</h2>
                  <Button onClick={addOption} size="sm">
                    <Plus className="w-4 h-4" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {options.map((option) => (
                    <div key={option.id} className="flex gap-2 items-center">
                      <select
                        value={option.type}
                        onChange={(e) =>
                          updateOption(option.id, 'type', e.target.value)
                        }
                        className="px-2 py-1 border rounded bg-background text-sm"
                      >
                        <option value="normal">Normal</option>
                        <option value="header">Header</option>
                        <option value="separator">Separator</option>
                      </select>
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) =>
                          updateOption(option.id, 'text', e.target.value)
                        }
                        className="flex-1 px-3 py-1 border rounded-md bg-background text-sm"
                        placeholder="Option text"
                      />
                      <Button
                        onClick={() => removeOption(option.id)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Links */}
              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-xl font-semibold mb-4">Footer Links</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Player ID
                    </label>
                    <input
                      type="text"
                      value={footerLinks.playerId}
                      onChange={(e) =>
                        setFooterLinks({
                          ...footerLinks,
                          playerId: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      placeholder="1234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Wiki Name
                    </label>
                    <input
                      type="text"
                      value={footerLinks.wikiName}
                      onChange={(e) =>
                        setFooterLinks({
                          ...footerLinks,
                          wikiName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      placeholder="Dalton_Gross"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Footer Font Size (px)
                    </label>
                    <input
                      type="number"
                      value={styles.footerFontSize}
                      onChange={(e) =>
                        setStyles({
                          ...styles,
                          footerFontSize: parseInt(e.target.value) || 14,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Preview/Code */}
            <div className="space-y-6">
              <div className="bg-card p-6 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setActiveTab('preview')}
                      variant={activeTab === 'preview' ? 'default' : 'outline'}
                      size="sm"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </Button>
                    <Button
                      onClick={() => setActiveTab('code')}
                      variant={activeTab === 'code' ? 'default' : 'outline'}
                      size="sm"
                    >
                      <Code className="w-4 h-4" />
                      BBCode
                    </Button>
                  </div>
                  <Button onClick={copyToClipboard} variant="outline" size="sm">
                    <Copy className="w-4 h-4" />
                    {copySuccess ? 'Copied!' : 'Copy Code'}
                  </Button>
                </div>

                {activeTab === 'preview' ? (
                  <div className="bg-white p-4 rounded-md overflow-hidden">
                    <div
                      style={{
                        ...(styles.containerBackgroundColor &&
                          styles.containerBackgroundColor.toLowerCase() !==
                            'transparent' &&
                          styles.containerBackgroundColor.toLowerCase() !==
                            'none' && {
                            backgroundColor: styles.containerBackgroundColor,
                          }),
                        color: styles.containerTextColor,
                        width: styles.containerWidth,
                        ...(styles.containerBorderTopColor &&
                          styles.containerBorderTopColor.toLowerCase() !==
                            'transparent' &&
                          styles.containerBorderTopColor.toLowerCase() !==
                            'none' && {
                            borderTop: `3px solid ${styles.containerBorderTopColor}`,
                          }),
                        ...(styles.containerBorderBottomColor &&
                          styles.containerBorderBottomColor.toLowerCase() !==
                            'transparent' &&
                          styles.containerBorderBottomColor.toLowerCase() !==
                            'none' && {
                            borderBottom: `3px solid ${styles.containerBorderBottomColor}`,
                          }),
                        borderRadius: `${styles.containerBorderRadius}px`,
                        fontSize: `${styles.containerFontSize}px`,
                        textAlign: 'center',
                        margin: '0 auto',
                        padding: '10px',
                      }}
                    >
                      <select
                        style={{
                          backgroundColor: styles.selectBackgroundColor,
                          color: styles.selectTextColor,
                          fontFamily: 'Arial',
                          fontSize: `${styles.selectFontSize}px`,
                          width: `${styles.selectWidth}px`,
                          maxWidth: '100%',
                          borderRadius: `${styles.selectBorderRadius}px`,
                          margin: `${styles.selectMargin}px`,
                          textAlign: 'center',
                          border: '1px solid #ccc',
                          padding: '4px',
                        }}
                      >
                        {options.map((option) => (
                          <option key={option.id} value={option.text}>
                            {option.text}
                          </option>
                        ))}
                      </select>
                      {(footerLinks.playerId || footerLinks.wikiName) && (
                        <div
                          style={{
                            marginTop: '8px',
                            fontSize: `${styles.footerFontSize}px`,
                          }}
                        >
                          {footerLinks.playerId && (
                            <a
                              href={`https://portal.sim-football.com/player/${footerLinks.playerId}`}
                              style={{
                                color: styles.containerTextColor,
                                textDecoration: 'underline',
                              }}
                            >
                              Player
                            </a>
                          )}
                          {footerLinks.playerId &&
                            footerLinks.wikiName &&
                            ' | '}
                          {footerLinks.wikiName && (
                            <a
                              href={`https://wiki.sim-football.com/view/${footerLinks.wikiName}`}
                              style={{
                                color: styles.containerTextColor,
                                textDecoration: 'underline',
                              }}
                            >
                              Wiki
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted dark:bg-[oklch(0.32_0.08_264)] p-4 rounded-md">
                    <pre className="whitespace-pre-wrap text-sm font-mono overflow-x-auto text-foreground">
                      {generateBBCode()}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    </PageLayout>
  );
}
