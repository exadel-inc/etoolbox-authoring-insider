/*
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.exadel.etoolbox.insider.servlet.media;

import com.day.cq.dam.api.Rendition;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ValueMap;

import java.util.function.Predicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A {@link Predicate} implementation that filters {@link Rendition} objects based on their dimensions with use of the
 * provided user constraints
 */
class BoundariesPredicate implements Predicate<Rendition> {

    private static final Pattern SIZE_PATTERN = Pattern.compile("(\\d+)\\.(\\d+)(?=\\.\\w+$)");

    private static final String SEPARATOR_X = "x";
    private static final String SEPARATOR_COLON = ":";
    private static final String SEPARATOR_DASH = "-";

    @Getter(value = AccessLevel.PACKAGE)
    private final Boundaries boundaries;

    /**
     * Creates a new instance of the {@link BoundariesPredicate} class
     * @param value A {@code String} value representing the user constraints for the rendition dimensions
     */
    BoundariesPredicate(String value) {
        boundaries = getBoundaries(value);
    }

    /**
     * Get the passable target size for a synthetic rendition based on the user constraints
     * @return A {@link Size} object
     */
    Size getTargetSize() {
        if (boundaries.getMinWidth() > 0 && boundaries.getMinHeight() > 0) {
            return new Size(boundaries.getMinWidth(), boundaries.getMinHeight());
        }
        if (boundaries.getMaxWidth() < Integer.MAX_VALUE && boundaries.getMaxHeight() < Integer.MAX_VALUE) {
            return new Size(boundaries.getMaxWidth(), boundaries.getMaxHeight());
        }
        return Size.DEFAULT;
    }

    /**
     * Tests whether the given {@link Rendition} object meets the user constraints for the rendition dimensions
     * @param rendition The {@link Rendition} object to test
     * @return True or false
     */
    @Override
    public boolean test(Rendition rendition) {
        Size size = getSize(rendition, rendition.getResourceResolver());
        return boundaries.contains(size);
    }

    private static Size getSize(Rendition rendition, ResourceResolver resolver) {
        Matcher matcher = SIZE_PATTERN.matcher(rendition.getName());
        if (matcher.find()) {
            int width = Integer.parseInt(matcher.group(1));
            int height = Integer.parseInt(matcher.group(2));
            return new Size(width, height);
        }
        Resource metadataResource = resolver.getResource(rendition.getPath() + "/jcr:content/metadata");
        ValueMap metadata = metadataResource != null ? metadataResource.adaptTo(ValueMap.class) : null;
        if (metadata == null) {
            return Size.EMPTY;
        }
        int width = metadata.get("tiff:ImageWidth", 0);
        int height = metadata.get("tiff:ImageLength", 0);
        return new Size(width, height);
    }

    private static Boundaries getBoundaries(String source) {
        if (StringUtils.isBlank(source)) {
            return Boundaries.DEFAULT;
        }

        source = source.trim();
        String[] parts;
        int correction = 0;

        if (source.contains(SEPARATOR_COLON)) {
            parts = source.split(SEPARATOR_COLON);
        } else if (source.contains(SEPARATOR_DASH)) {
            parts = source.split(SEPARATOR_DASH);
        } else if (source.startsWith(">=")) {
            parts = new String[]{source.substring(2), StringUtils.EMPTY};
        } else if (source.startsWith(">")) {
            parts = new String[]{source.substring(1), StringUtils.EMPTY};
            correction = 1;
        } else if (source.startsWith("<=")) {
            parts = new String[]{StringUtils.EMPTY, source.substring(2)};
        } else if (source.startsWith("<")) {
            parts = new String[]{StringUtils.EMPTY, source.substring(1)};
            correction = -1;
        } else {
            parts = new String[]{source};
        }

        if (parts.length == 1) {
            parts = new String[]{parts[0], StringUtils.EMPTY};
        }

        Size leftBoundary = getBoundarySide(parts[0], correction, 0);
        Size rightBoundary = getBoundarySide(parts[1], correction, Integer.MAX_VALUE);
        return new Boundaries(leftBoundary, rightBoundary);
    }

    private static Size getBoundarySide(String source, int correction, int defaultValue) {
        if (StringUtils.isBlank(source)) {
            return new Size(defaultValue, defaultValue);
        }
        String widthString = StringUtils.substringBefore(source, SEPARATOR_X).trim();
        String heightString = StringUtils.substringAfter(source, SEPARATOR_X).trim();
        if (!StringUtils.isNumeric(widthString)) {
            return new Size(defaultValue, defaultValue);
        }

        int width = getNonNegativeInteger(widthString, correction, defaultValue);
        if (!StringUtils.isNumeric(heightString)) {
            //noinspection SuspiciousNameCombination
            return new Size(width, width);
        }
        int height = getNonNegativeInteger(heightString, correction, defaultValue);
        return new Size(width, height);
    }

    private static int getNonNegativeInteger(String source, int correction, int defaultValue) {
        int result = Integer.parseInt(source);
        return result >= 0 ? result + correction : defaultValue;
    }

    /**
     * A simple data class representing the size of an image
     */
    @RequiredArgsConstructor(access = AccessLevel.PRIVATE)
    @Getter
    static class Size {

        static final Size EMPTY = new Size(0, 0);
        static final Size DEFAULT = new Size(200, 200);

        private final int width;
        private final int height;

        boolean isEmpty() {
            return width == 0 || height == 0;
        }
    }

    /**
     * A simple data class representing the boundaries for the image size
     */
    @RequiredArgsConstructor(access = AccessLevel.PRIVATE)
    @Getter
    static class Boundaries {

        static final Boundaries DEFAULT = new Boundaries(100, 100, 600, 600);

        private final int minWidth;
        private final int minHeight;
        private final int maxWidth;
        private final int maxHeight;

        Boundaries(Size left, Size right) {
            this(left.getWidth(), left.getHeight(), right.getWidth(), right.getHeight());
        }

        boolean contains(Size size) {
            if (size.isEmpty() || minWidth >= maxWidth || minHeight >= maxHeight) {
                return true;
            }
            return size.getWidth() >= minWidth
                    && size.getWidth() <= maxWidth
                    && size.getHeight() >= minHeight
                    && size.getHeight() <= maxHeight;
        }
    }
}
