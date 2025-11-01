/**
 * RSS Feed Parser
 * 
 * Simple RSS parser for film festival and movie news feeds
 */

export interface RSSItem {
  title: string
  link: string
  description: string
  pubDate: string
  imageUrl?: string
}

export interface RSSFeed {
  title: string
  description: string
  items: RSSItem[]
}

/**
 * Parse RSS XML feed
 * Note: This uses server-side XML parsing. For client-side, use a different approach.
 */
export async function parseRSSFeed(feedUrl: string, timeoutMs: number = 5000): Promise<RSSFeed | null> {
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`RSS feed timeout after ${timeoutMs}ms`)), timeoutMs)
    })

    // Race between fetch and timeout
    const fetchPromise = fetch(feedUrl, {
      next: { revalidate: 3600 }, // Cache for 1 hour
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    })

    const response = await Promise.race([fetchPromise, timeoutPromise])
    
    if (!response.ok) {
      console.error(`RSS feed fetch failed: ${response.status} ${response.statusText} for ${feedUrl}`)
      return null
    }
    
    const xmlText = await response.text()
    
    if (!xmlText || xmlText.length === 0) {
      console.error('RSS feed returned empty content')
      return null
    }
    
    // Parse XML using regex (server-side compatible)
    // Extract channel info - handle CDATA sections
    const titleMatch = xmlText.match(/<title[^>]*>(?:<!\[CDATA\[)?([^<]+)(?:\]\]>)?<\/title>/i) ||
                      xmlText.match(/<title[^>]*>([^<]+)<\/title>/i)
    const descriptionMatch = xmlText.match(/<description[^>]*>(?:<!\[CDATA\[)?([^<]+)(?:\]\]>)?<\/description>/i) ||
                             xmlText.match(/<description[^>]*>([^<]+)<\/description>/i)
    
    const title = titleMatch ? titleMatch[1].trim() : 'RSS Feed'
    const description = descriptionMatch ? descriptionMatch[1].trim() : ''
    
    // Extract items
    const items: RSSItem[] = []
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    let itemMatch
    const itemMatches: RegExpMatchArray[] = []
    while ((itemMatch = itemRegex.exec(xmlText)) !== null) {
      itemMatches.push(itemMatch)
    }
    
    for (const itemMatch of itemMatches) {
      if (!itemMatch || !itemMatch[1]) continue
      const itemContent = itemMatch[1]
      
      // Handle CDATA sections in title - improved regex to handle nested CDATA
      const itemTitleMatch = itemContent.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) ||
                            itemContent.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
                            itemContent.match(/<title[^>]*>([^<]+)<\/title>/i)
      // Handle both <link>text</link> and <link href="url"/> formats
      const itemLinkMatch = itemContent.match(/<link[^>]*>([^<]+)<\/link>/i) ||
                            itemContent.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i)
      const itemDescMatch = itemContent.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || 
                            itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i)
      const itemDateMatch = itemContent.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i) ||
                            itemContent.match(/<dc:date[^>]*>([^<]+)<\/dc:date>/i)
      
      let itemTitle = itemTitleMatch ? itemTitleMatch[1].trim() : ''
      // Clean HTML entities from title
      itemTitle = itemTitle
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#8217;/g, "'")
        .replace(/&#8211;/g, "–")
        .replace(/&#8212;/g, "—")
        .replace(/&hellip;/g, "...")
        .trim()
      const itemLink = itemLinkMatch ? itemLinkMatch[1].trim() : ''
      const itemDescription = itemDescMatch ? itemDescMatch[1].trim() : ''
      const itemPubDate = itemDateMatch ? itemDateMatch[1].trim() : ''
      
      // Skip if no title or link
      if (!itemTitle || !itemLink) continue
      
      // Extract image - try multiple formats
      let imageUrl: string | undefined
      
      // Try media:thumbnail first (most common)
      const thumbnailMatch = itemContent.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)
      if (thumbnailMatch) {
        imageUrl = thumbnailMatch[1]
      }
      
      // Try enclosure
      if (!imageUrl) {
        const enclosureMatch = itemContent.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/([^"']+)["']/i)
        if (enclosureMatch) {
          imageUrl = enclosureMatch[1]
        }
      }
      
      // Try media:content
      if (!imageUrl) {
        const mediaMatch = itemContent.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
                          itemContent.match(/<content[^>]+url=["']([^"']+)["']/i)
        if (mediaMatch) {
          imageUrl = mediaMatch[1]
        }
      }
      
      // Try to extract from description HTML - look for first img tag
      if (!imageUrl && itemDescription) {
        // Try multiple patterns for img tags - handle CDATA and regular HTML
        const imgPatterns = [
          /<img[^>]+src=["']([^"']+)["']/i,
          /<img[^>]+src=([^\s>]+)/i,
          /src=["']([^"']+\.(jpg|jpeg|png|gif|webp))["']/i
        ]
        
        for (const pattern of imgPatterns) {
          const imgMatch = itemDescription.match(pattern)
          if (imgMatch) {
            let imgSrc = imgMatch[1]
            // Clean up the URL if needed
            imgSrc = imgSrc.replace(/^["']|["']$/g, '').trim()
            // Skip data URIs, tracking pixels, and very small images
            if (imgSrc && 
                !imgSrc.startsWith('data:') && 
                !imgSrc.includes('1x1') && 
                !imgSrc.includes('pixel') &&
                !imgSrc.includes('tracking') &&
                imgSrc.length > 10) {
              // Make relative URLs absolute if needed
              if (imgSrc.startsWith('//')) {
                imageUrl = `https:${imgSrc}`
              } else if (imgSrc.startsWith('/')) {
                // Try to extract domain from link
                try {
                  const urlObj = new URL(itemLink)
                  imageUrl = `${urlObj.protocol}//${urlObj.host}${imgSrc}`
                } catch {
                  imageUrl = imgSrc
                }
              } else if (imgSrc.startsWith('http')) {
                imageUrl = imgSrc
              }
              break
            }
          }
        }
      }
      
      // Clean description HTML
      const cleanDescription = itemDescription
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .trim()
        .substring(0, 200)
      
      items.push({
        title: itemTitle,
        link: itemLink,
        description: cleanDescription,
        pubDate: itemPubDate,
        imageUrl,
      })
    }
    
    return {
      title,
      description,
      items: items.slice(0, 10), // Limit to 10 items
    }
  } catch (error) {
    console.error('Error parsing RSS feed:', error)
    return null
  }
}

